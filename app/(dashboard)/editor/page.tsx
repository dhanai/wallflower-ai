'use client';

import { useEffect, useState } from 'react';
import CanvasEditor from '@/components/CanvasEditor';

export default function EditorPage() {
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserRole() {
      try {
        const response = await fetch('/api/auth/user-role');
        if (response.ok) {
          const { role } = await response.json();
          console.log('User role fetched:', role);
          setUserRole(role || null);
        } else {
          console.error('Failed to fetch user role:', response.status);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    }

    fetchUserRole();
  }, []);

  return <CanvasEditor embedded userRole={userRole} />;
}
