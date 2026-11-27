'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { listStaff, setUserRole, StaffMember } from '@/actions/role';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ALL_ROLES, ROLE, ROLE_LABELS, Role } from '@/lib/rbac';

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  USER: 'Regular learner, no admin access',
  MODERATOR: 'Moderate comments, questions and answers',
  INSTRUCTOR: 'Moderator + manage courses, content and calendar',
  ADMIN: 'Full access, including users, roles and bounties',
};

const selectClass =
  'h-14 w-full rounded-md border bg-background px-2 text-sm';

const ManageRoles = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>(ROLE.MODERATOR);
  const [saving, setSaving] = useState(false);

  const loadStaff = useCallback(async () => {
    const res = await listStaff();
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setStaff(res.data ?? []);
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const applyRole = async (targetEmail: string, targetRole: Role) => {
    setSaving(true);
    try {
      const res = await setUserRole(targetEmail, targetRole);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `${res.data?.email} is now ${ROLE_LABELS[res.data!.role]}`,
      );
      await loadStaff();
    } catch {
      toast.error('Failed to update role.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await applyRole(email, role);
    setEmail('');
  };

  return (
    <div className="h-full w-full">
      <Accordion
        defaultValue="manage-roles"
        className="rounded-2xl border-2 p-4"
        type="single"
        collapsible
      >
        <AccordionItem className="border-none" value="manage-roles">
          <AccordionTrigger className="p-6 text-lg font-bold lg:text-2xl">
            <div className="flex flex-col gap-4">
              <ShieldCheck size={40} /> Manage Roles
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <form className="h-full w-full" onSubmit={handleSubmit}>
              <div className="grid w-full grid-cols-1 rounded-lg shadow-sm dark:border-gray-800 md:grid-cols-7">
                <div className="col-span-1 grid gap-2 p-6 lg:col-span-3">
                  <div className="text-sm font-medium leading-none text-gray-500 dark:text-gray-400">
                    Give a user a role. They must have signed in at least once.
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                    {ALL_ROLES.map((r) => (
                      <li key={r}>
                        <span className="font-semibold">{ROLE_LABELS[r]}</span>
                        : {ROLE_DESCRIPTIONS[r]}
                      </li>
                    ))}
                  </ul>
                </div>

                <aside className="col-span-1 flex w-full flex-col gap-6 lg:col-span-4">
                  <Input
                    className="h-14 w-full px-2"
                    name="email"
                    type="email"
                    required
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <select
                    className={selectClass}
                    aria-label="Role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <Button className="w-full lg:w-[20%]" disabled={saving}>
                    Save role
                  </Button>
                </aside>
              </div>
            </form>

            <div className="mt-6 px-6">
              <h3 className="mb-2 font-semibold">Current staff</h3>
              {staff.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No users have a role above User yet. Emails in the ADMINS env
                  var are admins even if they are not listed here.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((member) => (
                        <tr key={member.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">{member.name ?? '-'}</td>
                          <td className="py-2 pr-4">{member.email}</td>
                          <td className="py-2">
                            {member.locked ? (
                              <span title="Listed in the ADMINS env var">
                                Admin (env)
                              </span>
                            ) : (
                              <select
                                className="rounded-md border bg-background px-2 py-1"
                                aria-label={`Role for ${member.email}`}
                                value={member.role}
                                disabled={saving || !member.email}
                                onChange={(e) =>
                                  member.email &&
                                  applyRole(member.email, e.target.value as Role)
                                }
                              >
                                {ALL_ROLES.map((r) => (
                                  <option key={r} value={r}>
                                    {ROLE_LABELS[r]}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default ManageRoles;
