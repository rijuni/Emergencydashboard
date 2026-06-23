import StaffMasterPage from "../components/common/StaffMasterPage";

export default function EmployeeMasterPage() {
  return (
    <StaffMasterPage
      mode="employee"
      title="Employee Master"
      subtitle="Admin and Super Admin can maintain non-doctor employee records used in duty operations"
      addButtonLabel="Add Employee"
      listEndpoint="/staff/master/employees"
      emptyStateMessage="No employees found. Add your first employee record."
      showStatusFilter={true}
    />
  );
}
