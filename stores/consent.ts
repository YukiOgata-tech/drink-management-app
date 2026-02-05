import { create } from 'zustand';
import { ConsentRecord, LEGAL_VERSIONS } from '@/types';
import { consentStorage } from '@/lib/storage';

const CONSENT_STORAGE_KEY = 'consent_record';

interface ConsentState {
  consentRecord: ConsentRecord | null;
  isLoaded: boolean;
  isLoading: boolean;

  // Getters
  isAgeVerified: () => boolean;
  isFullyConsented: () => boolean;
  needsConsentUpdate: () => boolean;

  // Actions
  loadConsent: () => Promise<void>;
  verifyAge: (birthday: string) => Promise<{ isAdult: boolean }>;
  agreeToTerms: () => Promise<void>;
  agreeToPrivacyPolicy: () => Promise<void>;
  acknowledgeWarning: () => Promise<void>;
  completeConsent: (birthday: string) => Promise<{ isAdult: boolean }>;
  clearConsent: () => Promise<void>;
}

/**
 * 生年月日から20歳以上かどうかを判定
 */
function isAdultByBirthday(birthday: string): boolean {
  const birthDate = new Date(birthday);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age >= 20;
}

export const useConsentStore = create<ConsentState>((set, get) => ({
  consentRecord: null,
  isLoaded: false,
  isLoading: false,

  // 年齢確認済みかどうか
  isAgeVerified: () => {
    const record = get().consentRecord;
    return !!record?.isAdult && !!record?.ageVerifiedAt;
  },

  // 全ての同意が完了しているか
  isFullyConsented: () => {
    const record = get().consentRecord;
    if (!record) return false;

    return (
      record.isAdult &&
      record.termsVersion === LEGAL_VERSIONS.TERMS &&
      record.privacyPolicyVersion === LEGAL_VERSIONS.PRIVACY_POLICY &&
      !!record.drinkingWarningAcknowledgedAt
    );
  },

  // 同意の更新が必要か（バージョンが古い場合）
  needsConsentUpdate: () => {
    const record = get().consentRecord;
    if (!record) return true;

    return (
      record.termsVersion !== LEGAL_VERSIONS.TERMS ||
      record.privacyPolicyVersion !== LEGAL_VERSIONS.PRIVACY_POLICY
    );
  },

  // ストレージから同意記録を読み込み
  loadConsent: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });

    try {
      const json = await consentStorage.getString(CONSENT_STORAGE_KEY);
      if (json) {
        const record = JSON.parse(json) as ConsentRecord;
        set({ consentRecord: record, isLoaded: true });
      } else {
        set({ consentRecord: null, isLoaded: true });
      }
    } catch (error) {
      console.error('Error loading consent:', error);
      set({ consentRecord: null, isLoaded: true });
    } finally {
      set({ isLoading: false });
    }
  },

  // 年齢確認
  verifyAge: async (birthday: string) => {
    const isAdult = isAdultByBirthday(birthday);
    const now = new Date().toISOString();

    const currentRecord = get().consentRecord;
    const newRecord: ConsentRecord = {
      ...currentRecord,
      birthday,
      ageVerifiedAt: now,
      isAdult,
      termsVersion: currentRecord?.termsVersion || '',
      termsAgreedAt: currentRecord?.termsAgreedAt || '',
      privacyPolicyVersion: currentRecord?.privacyPolicyVersion || '',
      privacyPolicyAgreedAt: currentRecord?.privacyPolicyAgreedAt || '',
      drinkingWarningAcknowledgedAt: currentRecord?.drinkingWarningAcknowledgedAt || '',
    };

    await consentStorage.set(CONSENT_STORAGE_KEY, JSON.stringify(newRecord));
    set({ consentRecord: newRecord });

    return { isAdult };
  },

  // 利用規約への同意
  agreeToTerms: async () => {
    const currentRecord = get().consentRecord;
    if (!currentRecord) return;

    const now = new Date().toISOString();
    const newRecord: ConsentRecord = {
      ...currentRecord,
      termsVersion: LEGAL_VERSIONS.TERMS,
      termsAgreedAt: now,
    };

    await consentStorage.set(CONSENT_STORAGE_KEY, JSON.stringify(newRecord));
    set({ consentRecord: newRecord });
  },

  // プライバシーポリシーへの同意
  agreeToPrivacyPolicy: async () => {
    const currentRecord = get().consentRecord;
    if (!currentRecord) return;

    const now = new Date().toISOString();
    const newRecord: ConsentRecord = {
      ...currentRecord,
      privacyPolicyVersion: LEGAL_VERSIONS.PRIVACY_POLICY,
      privacyPolicyAgreedAt: now,
    };

    await consentStorage.set(CONSENT_STORAGE_KEY, JSON.stringify(newRecord));
    set({ consentRecord: newRecord });
  },

  // 飲酒注意事項の確認
  acknowledgeWarning: async () => {
    const currentRecord = get().consentRecord;
    if (!currentRecord) return;

    const now = new Date().toISOString();
    const newRecord: ConsentRecord = {
      ...currentRecord,
      drinkingWarningAcknowledgedAt: now,
    };

    await consentStorage.set(CONSENT_STORAGE_KEY, JSON.stringify(newRecord));
    set({ consentRecord: newRecord });
  },

  // 一括同意（年齢確認 + 全ての同意を一度に行う）
  completeConsent: async (birthday: string) => {
    const isAdult = isAdultByBirthday(birthday);
    const now = new Date().toISOString();

    const newRecord: ConsentRecord = {
      birthday,
      ageVerifiedAt: now,
      isAdult,
      termsVersion: LEGAL_VERSIONS.TERMS,
      termsAgreedAt: now,
      privacyPolicyVersion: LEGAL_VERSIONS.PRIVACY_POLICY,
      privacyPolicyAgreedAt: now,
      drinkingWarningAcknowledgedAt: now,
    };

    await consentStorage.set(CONSENT_STORAGE_KEY, JSON.stringify(newRecord));
    set({ consentRecord: newRecord });

    return { isAdult };
  },

  // 同意記録をクリア（デバッグ用）
  clearConsent: async () => {
    await consentStorage.delete(CONSENT_STORAGE_KEY);
    set({ consentRecord: null });
  },
}));
