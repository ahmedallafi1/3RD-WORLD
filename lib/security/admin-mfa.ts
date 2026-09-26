import {query,withTransaction} from "@/lib/db";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  hashMfaChallengeToken,
  hashRecoveryCode,
  makeTotpUri,
  newMfaChallengeToken,
  newRecoveryCode,
  verifyTotp,
} from "@/lib/security/totp";

export async function createAdminMfaChallenge(adminUserId:string){
  const token=newMfaChallengeToken();
  const expiresAt=new Date(Date.now()+10*60*1000);
  await query(
    `DELETE FROM admin_mfa_challenges
     WHERE admin_user_id=$1 OR expires_at<=now()`,
    [adminUserId],
  );
  await query(
    `INSERT INTO admin_mfa_challenges(admin_user_id,token_hash,expires_at)
     VALUES($1,$2,$3)`,
    [adminUserId,hashMfaChallengeToken(token),expiresAt],
  );
  return {token,expiresAt};
}

export async function verifyAdminMfaChallenge(args:{
  token:string;
  code:string;
}){
  return withTransaction(async client=>{
    const result=await client.query<{
      id:string;
      admin_user_id:string;
      attempts:number;
      secret:string|null;
    }>(
      `SELECT c.id,c.admin_user_id,c.attempts,u.totp_secret_ciphertext AS secret
       FROM admin_mfa_challenges c
       JOIN admin_users u ON u.id=c.admin_user_id
       WHERE c.token_hash=$1
         AND c.expires_at>now()
         AND u.active=true
         AND u.totp_enabled=true
       FOR UPDATE`,
      [hashMfaChallengeToken(args.token)],
    );
    const row=result.rows[0];
    if(!row||!row.secret)throw new Error("MFA challenge is invalid or expired.");
    if(row.attempts>=6)throw new Error("MFA challenge is locked.");

    const normalized=args.code.trim().toUpperCase().replace(/\s+/g,"");
    let verified=verifyTotp(decryptTotpSecret(row.secret),normalized);

    if(!verified){
      const recovery=await client.query<{id:string}>(
        `SELECT id FROM admin_recovery_codes
         WHERE admin_user_id=$1
           AND code_hash=$2
           AND used_at IS NULL
         LIMIT 1
         FOR UPDATE`,
        [row.admin_user_id,hashRecoveryCode(normalized)],
      );
      if(recovery.rows[0]){
        verified=true;
        await client.query(
          "UPDATE admin_recovery_codes SET used_at=now() WHERE id=$1",
          [recovery.rows[0].id],
        );
      }
    }

    if(!verified){
      await client.query(
        "UPDATE admin_mfa_challenges SET attempts=attempts+1 WHERE id=$1",
        [row.id],
      );
      throw new Error("Invalid authentication code.");
    }

    await client.query("DELETE FROM admin_mfa_challenges WHERE id=$1",[row.id]);
    return {adminUserId:row.admin_user_id};
  });
}

export async function beginAdminMfaSetup(args:{
  adminUserId:string;
  email:string;
}){
  const secret=generateTotpSecret();
  const encrypted=encryptTotpSecret(secret);
  const expiresAt=new Date(Date.now()+15*60*1000);

  await query(
    `INSERT INTO admin_mfa_setup(admin_user_id,secret_ciphertext,expires_at)
     VALUES($1,$2,$3)
     ON CONFLICT(admin_user_id)
     DO UPDATE SET secret_ciphertext=EXCLUDED.secret_ciphertext,
                   expires_at=EXCLUDED.expires_at,
                   created_at=now()`,
    [args.adminUserId,encrypted,expiresAt],
  );

  return {
    secret,
    uri:makeTotpUri({email:args.email,secret}),
    expiresAt,
  };
}

export async function completeAdminMfaSetup(args:{
  adminUserId:string;
  code:string;
}){
  return withTransaction(async client=>{
    const pending=await client.query<{secret_ciphertext:string}>(
      `SELECT secret_ciphertext
       FROM admin_mfa_setup
       WHERE admin_user_id=$1 AND expires_at>now()
       FOR UPDATE`,
      [args.adminUserId],
    );
    const encrypted=pending.rows[0]?.secret_ciphertext;
    if(!encrypted)throw new Error("MFA setup expired. Start again.");

    const secret=decryptTotpSecret(encrypted);
    if(!verifyTotp(secret,args.code))throw new Error("Invalid authentication code.");

    await client.query(
      `UPDATE admin_users
       SET totp_enabled=true,totp_secret_ciphertext=$2,updated_at=now()
       WHERE id=$1`,
      [args.adminUserId,encrypted],
    );
    await client.query("DELETE FROM admin_mfa_setup WHERE admin_user_id=$1",[args.adminUserId]);
    await client.query("DELETE FROM admin_recovery_codes WHERE admin_user_id=$1",[args.adminUserId]);

    const recoveryCodes=Array.from({length:8},()=>newRecoveryCode());
    for(const code of recoveryCodes){
      await client.query(
        `INSERT INTO admin_recovery_codes(admin_user_id,code_hash)
         VALUES($1,$2)`,
        [args.adminUserId,hashRecoveryCode(code)],
      );
    }
    return {recoveryCodes};
  });
}

export async function disableAdminMfa(args:{
  adminUserId:string;
  code:string;
}){
  return withTransaction(async client=>{
    const user=await client.query<{secret:string|null;enabled:boolean}>(
      `SELECT totp_secret_ciphertext AS secret,totp_enabled AS enabled
       FROM admin_users WHERE id=$1 FOR UPDATE`,
      [args.adminUserId],
    );
    const row=user.rows[0];
    if(!row?.enabled||!row.secret)throw new Error("MFA is not enabled.");
    if(!verifyTotp(decryptTotpSecret(row.secret),args.code)){
      throw new Error("Invalid authentication code.");
    }

    await client.query(
      `UPDATE admin_users
       SET totp_enabled=false,totp_secret_ciphertext=NULL,updated_at=now()
       WHERE id=$1`,
      [args.adminUserId],
    );
    await client.query("DELETE FROM admin_recovery_codes WHERE admin_user_id=$1",[args.adminUserId]);
    await client.query("DELETE FROM admin_mfa_challenges WHERE admin_user_id=$1",[args.adminUserId]);
  });
}
