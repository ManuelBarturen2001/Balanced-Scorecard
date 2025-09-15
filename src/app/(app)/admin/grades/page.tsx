import { Suspense } from 'react';
import { GraderManagementPage } from '@/components/admin/grading/GraderManagementPage';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <GraderManagementPage />
    </Suspense>
  );
}

