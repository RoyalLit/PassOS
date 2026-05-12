import { createClient } from '@supabase/supabase-js';
import { fakerEN_IN as faker } from '@faker-js/faker';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const UNIVERSITY_NAME = "Amity University Punjab";

async function createPassRequest(student, tenantId, type, status, reason, destination, departureAt, returnBy, createdAt) {
  const requestStatus = (status === 'approved' || status === 'used_entry' || status === 'used_exit' || status === 'expired' || status === 'outside') ? 'approved' : status;
  const { data, error: reqErr } = await supabase
    .from('pass_requests')
    .insert({
      student_id: student.id,
      tenant_id: tenantId,
      request_type: type,
      status: requestStatus,
      reason,
      destination,
      departure_at: departureAt,
      return_by: returnBy,
      created_at: createdAt
    })
    .select().single();

  if (reqErr) return;

  if (requestStatus === 'approved') {
    const passStatus = (status === 'outside') ? 'used_exit' : (status === 'active' ? 'active' : 'used_entry');
    const { data: pass } = await supabase
        .from('passes')
        .insert({
            request_id: data.id,
            student_id: student.id,
            tenant_id: tenantId,
            status: passStatus,
            qr_payload: faker.string.alphanumeric(128),
            qr_nonce: faker.string.alphanumeric(32),
            valid_from: departureAt,
            valid_until: returnBy
        })
        .select().single();
    
    if (status === 'used_exit' || status === 'used_entry' || status === 'expired' || status === 'outside') {
        await supabase.from('pass_scans').insert({
            pass_id: pass.id,
            tenant_id: tenantId,
            guard_id: student.id,
            scan_type: 'exit',
            scan_result: 'valid',
            created_at: departureAt
        });
        if (status === 'outside') {
            await supabase.from('student_states').update({
                current_state: 'outside',
                active_pass_id: pass.id,
                last_exit: departureAt
            }).eq('student_id', student.id);
        }
        if (status === 'used_entry') {
            await supabase.from('pass_scans').insert({
                pass_id: pass.id,
                tenant_id: tenantId,
                guard_id: student.id,
                scan_type: 'entry',
                scan_result: 'valid',
                created_at: returnBy
            });
        }
    }
  }
}

async function seed() {
  console.log('🚀 Seeding Professional-Grade Data...');
  const timestamp = Date.now().toString().slice(-4);
  const UNIVERSITY_SLUG = `amity-pb-${timestamp}`;

  const { data: tenant } = await supabase.from('tenants').insert({
      name: UNIVERSITY_NAME, slug: UNIVERSITY_SLUG, status: 'active',
      plan: 'enterprise', domains: [`amity-${timestamp}.edu`]
  }).select().single();
  const tenantId = tenant.id;

  const roles = [{ role: 'admin', count: 1 }, { role: 'warden', count: 2 }, { role: 'student', count: 35 }];
  const createdUsers = [];

  for (const { role, count } of roles) {
    for (let i = 0; i < count; i++) {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}${timestamp}@amity.edu`;
      const { data, error: authErr } = await supabase.auth.admin.createUser({
        email, password: 'Password123!', email_confirm: true,
        user_metadata: { full_name: `${first} ${last}`, role }
      });
      if (authErr || !data.user) continue;
      const user = data.user;
      await supabase.from('profiles').update({ tenant_id: tenantId }).eq('id', user.id);
      createdUsers.push({ id: user.id, role, email });
    }
  }

  const students = createdUsers.filter(u => u.role === 'student');
  const outingSpots = [
    { r: "Medical Checkup", d: "Fortis Hospital Mohali" },
    { r: "Shopping", d: "Elante Mall Chandigarh" },
    { r: "Evening Out", d: "Sukhna Lake" },
    { r: "Coaching", d: "Sector 34 CHD" },
    { r: "Dinner", d: "Sector 26 CHD" },
    { r: "Work", d: "Mohali Phase 7" }
  ];

  console.log('📈 Historical Movements...');
  for (let d = 1; d <= 7; d++) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - d);
    for (let k = 0; k < 12; k++) {
      const student = faker.helpers.arrayElement(students);
      const spot = faker.helpers.arrayElement(outingSpots);
      const dep = new Date(targetDate);
      dep.setHours(faker.number.int({min: 9, max: 13}), faker.number.int({min: 0, max: 59}));
      const ret = new Date(dep);
      ret.setHours(faker.number.int({min: 16, max: 20}), faker.number.int({min: 0, max: 59}));
      await createPassRequest(student, tenantId, 'day_outing', 'used_entry', spot.r, spot.d, dep, ret, targetDate);
    }
  }

  console.log('⚡ Live Mobility Pulse...');
  for (let i = 0; i < 8; i++) {
    const student = students[i];
    const spot = faker.helpers.arrayElement(outingSpots);
    const dep = new Date();
    dep.setHours(dep.getHours() - faker.number.int({min: 1, max: 4}), faker.number.int({min: 0, max: 59}));
    const ret = new Date();
    ret.setHours(ret.getHours() + 4);
    await createPassRequest(student, tenantId, 'day_outing', 'outside', spot.r, spot.d, dep, ret, new Date());
  }

  console.log('📝 Action Center (Fixed Professional Hours)...');
  for (let i = 0; i < 7; i++) {
    const student = students[10 + i];
    const isOver = i % 4 === 0;
    const spot = faker.helpers.arrayElement(isOver ? [{r:"Home", d:"Ludhiana"}] : outingSpots);
    
    // Scheduled for TOMORROW
    const dep = new Date();
    dep.setDate(dep.getDate() + 1);
    
    if (isOver) {
        dep.setHours(10, 0); // 10 AM depart
        const ret = new Date(dep);
        ret.setDate(ret.getDate() + 2); // 2 days later
        ret.setHours(18, 30); // 6:30 PM return
        await createPassRequest(student, tenantId, 'overnight', 'pending', spot.r, spot.d, dep, ret, new Date());
    } else {
        dep.setHours(faker.number.int({min: 9, max: 12}), faker.number.int({min: 0, max: 59})); // Morning/Midday depart
        const ret = new Date(dep);
        ret.setHours(faker.number.int({min: 17, max: 20}), faker.number.int({min: 0, max: 59})); // Evening return
        await createPassRequest(student, tenantId, 'day_outing', 'pending', spot.r, spot.d, dep, ret, new Date());
    }
  }

  console.log('✨ Success!');
  const admin = createdUsers.find(u => u.role === 'admin');
  console.log('🔑 ADMIN:', admin ? admin.email : 'Check DB');
}

seed().catch(console.error);
