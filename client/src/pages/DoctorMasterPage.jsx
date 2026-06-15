import StaffMasterPage from "../components/common/StaffMasterPage";

export default function DoctorMasterPage() {
  return (
    <StaffMasterPage
      mode="doctor"
      title="Doctor Directory"
      subtitle="Super Admin can maintain the doctor list for casualty duty planning"
      addButtonLabel="Add Doctor"
      listEndpoint="/staff/master/doctors"
      emptyStateMessage="No doctors found. Add your first doctor record."
      showStatusFilter={true}
    />
  );
}
