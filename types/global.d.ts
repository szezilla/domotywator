declare global {
  interface RankingEntry {
    login: string;
    punkty: number;
  }

  interface Task {
    id: number;
    zadanie: string;
    punkty: number;
  }

  interface HistoryEntry {
    id: number;
    data: string;
    login: string;
    zadanie: string;
    punkty: number;
  }

  interface Dom {
    nazwa: string;
    kod_dolaczenia: string;
    cel_punktow?: number;
    zwyciezca_id?: number | null;
    zwyciezca_login?: string | null;
  }

  interface Window {
    CONFIG: { API_PREFIX: string; DONATE_PL?: string; DONATE_EN?: string };
    token: string | null;
    currentHouseName: string;
    globalTasks: any[];
    pendingInviteCode: string | null;
    currentGoal?: number;
    currentWinner?: { id: number; login: string } | null;
    i18n?: {
      t: (key: string, params?: Record<string, string | number>) => string;
      setLanguage: (lang: string) => Promise<void>;
      getLanguage: () => string;
      applyTranslations: (root?: ParentNode) => void;
      ready: Promise<void>;
    };

    apiCall: (endpoint: string, method?: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: object | null) => Promise<any>;
    parseJwt: (token: string) => any;
    wyloguj: () => void;

    hideAll: () => void;
    openScreen: (screenId: string) => void;
    toggleMenu: () => void;
    openCoffeeLink: () => Promise<void>;
    pokazRejestracje: () => void;
    pokazLogowanie: () => void;
    zapomnialemHasla: () => void;

    sprawdzDom: () => Promise<void>;
    initializeMainScreen: (dom: Dom, isOwner: boolean) => Promise<void>;

    pokazHistorie: () => Promise<void>;
    pokazListeZadan: (successMessageKey?: string) => Promise<void>;
    otworzEdycje: (id: number, nazwa: string, punkty: number) => void;
    usunZadanie: (id: number) => Promise<void>;
    filterTasks: (query: string) => void;
    renderRank: (list: RankingEntry[], goal?: number) => void;
    updateGoalDisplay: (ranking: RankingEntry[]) => void;

    pokazEkranZaproszenia: (kod: string) => Promise<void>;
    potwierdzDolaczenie: () => Promise<void>;
    anulujZaproszenie: () => void;

    stworzDom: () => Promise<void>;
    dolaczDoDomu: () => Promise<void>;
    copyLink: () => void;
    usunDom: () => Promise<void>;
    resetujGre: () => Promise<void>;
    zapiszCel: () => Promise<void>;
    opuscDom: () => Promise<void>;
    pokazZarzadzanieDomownikami: () => Promise<void>;
    wyrzucDomownika: (userId: number, userLogin: string) => Promise<void>;
    weryfikujStatusDomownika: () => Promise<void>;
    showModal: (opts: {
      title?: string;
      body?: string;
      okText?: string;
      cancelText?: string;
      type?: 'alert' | 'confirm';
    }) => Promise<boolean>;
  }

  const apiCall: Window['apiCall'];
  const openScreen: Window['openScreen'];
  const wyloguj: Window['wyloguj'];
  const pokazZarzadzanieDomownikami: () => Promise<void>;
  const wyrzucDomownika: (userId: number, userLogin: string) => Promise<void>;
  const weryfikujStatusDomownika: () => Promise<void>;
  const updateGoalDisplay: (ranking: RankingEntry[]) => void;
}

export {};
