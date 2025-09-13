export type Role = "system" | "user" | "assistant" | "tool";
export interface GeoPoint { lat: number; lng: number; }
export interface Place { label?: string; coords?: GeoPoint; }

export interface ChatMessage {
  role: Role;
  content: string;
  name?: string;
}

export interface ScheduleItem {
    title: string;
    instructions?: string;
    dow: number[];     // 1..7
    start: string;     // "HH:mm"
    end?: string;
    location?: Place;  // NEW
  }

  export interface PatientContext {
    name?: string;
    preferences?: Record<string, any>;
    caregivers?: { name: string; relation?: string }[];
    home?: Place;                         // NEW
    emergencyContacts?: EmergencyContact[]; // NEW
    notes?: string;
  }


  export interface EmergencyContact {
    name: string;
    relation?: string;
    phone?: string;
    email?: string;
  }



