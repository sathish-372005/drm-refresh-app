"use client";

import { useEffect, useState } from "react";

type User = {
  name: string | null;
  email: string | null;
  tenantId: string;
  userId: string;
};

export const SamplePage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        console.log("dddddddddddddddd",response)

        if (!response.ok) {
          throw new Error("Failed to fetch user");
        }

        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Unauthorized</div>;
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <h1>Hello {user.name}</h1>

      <p>Email: {user.email}</p>
      <p>Tenant ID: {user.tenantId}</p>
      <p>User ID: {user.userId}</p>
    </div>
  );
}