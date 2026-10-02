/** When the client may pay this installment. */
export type PaymentScheduleDueTrigger = 'on_accept' | 'on_prior_approved' | 'on_date';

export type PaymentScheduleInstallmentType = 'advance' | 'milestone' | 'final' | 'fullPayment';

/** Admin-defined payment installment stored on Quote.paymentSchedule. */
export type PaymentScheduleInstallment = {
  label: string;
  amountPaise: number;
  percentage?: number;
  dueTrigger: PaymentScheduleDueTrigger;
  dueDate?: string;
  type?: PaymentScheduleInstallmentType;
  order?: number;
};

/** Built-in presets the admin can pick when quoting. */
export type PaymentSchedulePresetId =
  | '50-50'
  | '30-70'
  | '30-40-30'
  | '25-25-25-25'
  | '100-upfront';

export type PaymentSchedulePresetDefinition = {
  id: PaymentSchedulePresetId;
  label: string;
  description: string;
  installments: Array<{
    label: string;
    percentage: number;
    dueTrigger: PaymentScheduleDueTrigger;
    type?: PaymentScheduleInstallmentType;
  }>;
};
