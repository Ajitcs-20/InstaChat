import React, { createContext, ReactNode, useContext, useState } from 'react';

export type Gender = 'male' | 'female' | 'other';
export type Preference = 'male' | 'female' | 'both';

export interface User {
  userId: string;
  name: string;
  age: number;
  gender: Gender;
  preference: Preference;
  profileImage?: string | null;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const logout = () => {
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
} 