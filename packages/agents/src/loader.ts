// Employee loader — fetches an Employee row by role and asserts it's active.

import { db, type Employee } from "@hoy/shared";

export class EmployeeNotFound extends Error {
  constructor(role: string) {
    super(`No employee registered with role "${role}". Check the employees table.`);
    this.name = "EmployeeNotFound";
  }
}

export class EmployeeInactive extends Error {
  constructor(role: string) {
    super(`Employee "${role}" exists but is not active. Activate via the dashboard or DB.`);
    this.name = "EmployeeInactive";
  }
}

export async function loadEmployee(role: string): Promise<Employee> {
  const { data, error } = await db().from("employees").select("*").eq("role", role).maybeSingle();
  if (error) throw error;
  if (!data) throw new EmployeeNotFound(role);
  if (!data.active) throw new EmployeeInactive(role);
  return data as Employee;
}
