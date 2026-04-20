import { Suspense } from 'react';
import { GradersOverviewPage } from '@/components/admin/grading/GradersOverviewPage';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <GradersOverviewPage />
    </Suspense>
  );
}

