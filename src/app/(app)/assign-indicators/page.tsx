"use client";

import { AssignIndicatorForm } from '@/components/assign-indicators/AssignIndicatorForm';
import { RouteProtector } from '@/components/dashboard/RouteProtector';

export default function AssignIndicatorsPage() {
  return (
    <RouteProtector allowedRoles={['asignador']}>
      <div className="lg:container mx-auto py-1 md:py-2">
        <AssignIndicatorForm />
      </div>
    </RouteProtector>
  );
}
