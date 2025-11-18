// Database types for TAYA - will be generated from Supabase schema
// This is a placeholder that will be updated when migrations are run

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          settings?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          settings?: Record<string, unknown>;
          updated_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description?: string;
          manager_id?: string;
          settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string;
          manager_id?: string;
          settings?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string;
          manager_id?: string;
          settings?: Record<string, unknown>;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          password_hash?: string;
          role: 'super_admin' | 'org_admin' | 'senior_manager' | 'manager' | 'lead' | 'member';
          organization_id: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          password_hash?: string;
          role: 'super_admin' | 'org_admin' | 'senior_manager' | 'manager' | 'lead' | 'member';
          organization_id: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          password_hash?: string;
          role?: 'super_admin' | 'org_admin' | 'senior_manager' | 'manager' | 'lead' | 'member';
          organization_id?: string;
          active?: boolean;
          updated_at?: string;
        };
      };
      // Additional tables will be added as migrations are created
    };
  };
}

