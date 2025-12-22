
export interface SystemSettings {
  id: string;
  center_name: string;
  speech_speed: number;
  ticker_speed: number;
  ticker_content: string;
}

export interface Doctor {
  id: string;
  number: number;
  name: string;
  specialty: string;
  working_days: string[];
  phone: string;
  image_url: string;
}

export interface Clinic {
  id: string;
  number: number;
  name: string;
  current_number: number;
  linked_screens: string[];
  password: string;
  status: 'active' | 'paused';
  last_called_at?: string;
}

export interface Screen {
  id: string;
  number: number;
  name: string;
  password: string;
  config?: {
    cardWidth?: string;
    cardHeight?: string;
    fontSize?: string;
    columns?: number;
    colorTheme?: string;
    layoutSplit?: '1/4' | '1/3' | '1/2' | '2/3';
  };
}

export interface Notification {
  id: string;
  from_clinic?: string;
  to_clinic?: string;
  to_admin?: boolean;
  message: string;
  type: 'normal' | 'emergency' | 'transfer' | 'name_call';
  created_at: string;
  patient_number?: number;
}
