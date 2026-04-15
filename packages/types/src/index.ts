export interface Member {
  id: string;
  name: string;
  phone: string;
  email?: string;
  joinDate: Date;
  active: boolean;
  planId: string;
  lastPayment?: Date;
}

export interface Payment {
  id: string;
  memberId: string;
  amount: number;
  date: Date;
  status: 'pending' | 'completed' | 'failed';
  method: string;
}

export interface Attendance {
  memberId: string;
  date: Date;
  status: 'present' | 'absent';
}
