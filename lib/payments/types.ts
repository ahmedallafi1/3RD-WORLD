export type PaymentSessionInput = {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  email: string;
};

export type PaymentSession = {
  provider: "stripe";
  providerPaymentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
};

export interface PaymentProvider {
  createPaymentSession(input: PaymentSessionInput): Promise<PaymentSession>;
  cancelPayment(providerPaymentId: string): Promise<void>;
}
