import { requireRole } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Search, Filter, Mail, Phone, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default async function StudentsDirectory() {
  await requireRole('admin');
  const supabase = await createServerSupabaseClient();

  // Fetch all students with their current state
  const { data: students } = await supabase
    .from('profiles')
    .select('*, state:student_states(*)')
    .eq('role', 'student')
    .order('full_name');

  const typedStudents = students || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Directory</h1>
          <p className="text-slate-500">Manage students and track their current campus locations</p>
        </div>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, email, or hostel..." 
              className="w-full bg-white border rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-white text-slate-600 font-medium text-sm hover:bg-slate-50">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b text-sm text-slate-500">
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Housing</th>
                <th className="px-6 py-4 font-medium">Current State</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {typedStudents.map((student: any) => {
                const state = student.state?.[0]?.current_state || 'inside';
                return (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                          {student.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{student.full_name}</p>
                          {student.is_flagged && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-red-100 text-red-700">
                              Flagged
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{student.email}</span>
                        </div>
                        {student.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{student.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-medium text-slate-900">{student.hostel || 'Unassigned'}</p>
                        {student.room_number && (
                          <p className="text-slate-500">Room {student.room_number}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        state === 'inside' ? 'bg-green-100 text-green-700' :
                        state === 'outside' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          state === 'inside' ? 'bg-green-500' :
                          state === 'outside' ? 'bg-blue-500' :
                          'bg-red-500'
                        }`}></span>
                        <span className="capitalize">{state}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/admin/students/${student.id}`} 
                        className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {typedStudents.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              No students found in the database.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
