export type PassportTier="MEMBER"|"EARLY"|"VIP";
export type DropAccessLevel="PUBLIC"|"EMAIL"|"CODE"|"EARLY"|"VIP"|"PRIVATE";
export type DropPhase="UPCOMING"|"EARLY"|"LIVE"|"CLOSED";

export type WorldRecord={
  id:string;
  code:string;
  title:string;
  slug:string;
  status:string;
  year:number|null;
  tagline:string|null;
  description:string|null;
  accentColor:string|null;
  launchAt:string|null;
  closeAt:string|null;
};

export type DropRecord={
  id:string;
  worldId:string;
  worldCode:string;
  worldSlug:string;
  name:string;
  slug:string;
  status:string;
  accessMode:"PUBLIC"|"EMAIL"|"CODE"|"PRIVATE";
  earlyAccessAt:string|null;
  opensAt:string|null;
  closesAt:string|null;
  headline:string|null;
  subheadline:string|null;
  waitlistEnabled:boolean;
  perVariantLimit:number;
};

export type DropAccessDecision={
  phase:DropPhase;
  granted:boolean;
  level:DropAccessLevel|null;
  reason:
    |"PUBLIC"
    |"SESSION"
    |"PASSPORT"
    |"GRANT"
    |"WAITLIST"
    |"CODE_REQUIRED"
    |"EMAIL_REQUIRED"
    |"PRIVATE"
    |"TOO_EARLY"
    |"CLOSED";
};
