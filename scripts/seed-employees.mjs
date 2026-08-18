import { Client, Databases, ID, Query } from "node-appwrite";
import { readFileSync } from "fs";

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8");
  const get = (name) => raw.match(new RegExp(`^${name}=(.+)$`, "m"))?.[1]?.trim();
  return {
    endpoint: get("NEXT_PUBLIC_APPWRITE_ENDPOINT"),
    projectId: get("NEXT_PUBLIC_APPWRITE_PROJECT_ID"),
    apiKey: get("APPWRITE_API_KEY"),
  };
}

const { endpoint, projectId, apiKey } = loadEnv();
const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const db = new Databases(client);
const DB = "erp";

async function main() {
  // Check existing employees
  const existing = await db.listDocuments(DB, "employees", [Query.limit(100)]);
  const existingNumbers = new Set(existing.documents.map(d => d.employee_number));
  console.log(`Existing employees: ${[...existingNumbers].join(", ") || "none"}`);

  const employees = [
    { employee_number: "EMP-002", full_name: "Siti Rahayu", position: "Staff Gudang", basic_salary: 4500000, hire_date: "2023-06-01", phone: "081234567891" },
    { employee_number: "EMP-003", full_name: "Andi Wijaya", position: "Kasir", basic_salary: 4000000, hire_date: "2024-01-10", phone: "081234567892" },
  ];

  const empIds = {};
  for (const emp of employees) {
    if (existingNumbers.has(emp.employee_number)) {
      console.log(`Skip existing: ${emp.employee_number}`);
      const found = existing.documents.find(d => d.employee_number === emp.employee_number);
      empIds[emp.employee_number] = found.$id;
      continue;
    }
    const doc = await db.createDocument({
      databaseId: DB, collectionId: "employees", documentId: ID.unique(),
      data: { ...emp, status: "active", address: null, user_id: null, created_by: "seed", created_at: new Date().toISOString() },
    });
    empIds[emp.employee_number] = doc.$id;
    console.log(`Created: ${emp.full_name} => ${doc.$id}`);
  }

  // Also find EMP-001
  if (existingNumbers.has("EMP-001")) {
    const found = existing.documents.find(d => d.employee_number === "EMP-001");
    empIds["EMP-001"] = found.$id;
  }

  // Check existing salary components
  const existingSC = await db.listDocuments(DB, "salary_components", [Query.limit(100)]);
  const existingSCNames = new Set(existingSC.documents.map(d => `${d.employee_id}:${d.name}`));
  console.log(`Existing salary components: ${existingSCNames.size}`);

  const salaryComponents = [
    { emp: "EMP-001", component_type: "allowance", name: "Tunjangan Jabatan", amount: 1500000 },
    { emp: "EMP-002", component_type: "allowance", name: "Tunjangan Makan", amount: 500000 },
    { emp: "EMP-002", component_type: "deduction", name: "BPJS Kesehatan", amount: 150000 },
    { emp: "EMP-003", component_type: "allowance", name: "Tunjangan Transport", amount: 400000 },
    { emp: "EMP-003", component_type: "deduction", name: "BPJS Kesehatan", amount: 120000 },
  ];

  for (const sc of salaryComponents) {
    const empId = empIds[sc.emp];
    if (!empId) { console.log(`Skip SC - no employee ${sc.emp}`); continue; }
    const key = `${empId}:${sc.name}`;
    if (existingSCNames.has(key)) { console.log(`Skip existing SC: ${sc.name} for ${sc.emp}`); continue; }
    const doc = await db.createDocument({
      databaseId: DB, collectionId: "salary_components", documentId: ID.unique(),
      data: { employee_id: empId, component_type: sc.component_type, name: sc.name, amount: sc.amount, is_active: true, created_at: new Date().toISOString() },
    });
    console.log(`Created SC: ${sc.name} for ${sc.emp} => ${doc.$id}`);
  }

  console.log("\nDone!");
}

main().catch((e) => { console.error(e); process.exit(1); });
