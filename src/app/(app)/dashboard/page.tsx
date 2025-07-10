"use client"; 

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { AssignedIndicator } from '@/lib/types';
import { IndicatorTable } from '@/components/dashboard/IndicatorTable';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCollectionWhereCondition } from '@/lib/firebase-functions';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [userIndicators, setUserIndicators] = useState<AssignedIndicator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {

    const fetchData = async () =>{

      const allAssignedIndicators = await getCollectionWhereCondition('assigned_indicator','userId',user?.id)
      if (!authLoading && user && allAssignedIndicators) {
        
        setUserIndicators(allAssignedIndicators as AssignedIndicator[]);
        setIsLoading(false);
      } else if (!authLoading && !user) {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user, authLoading]);

  if (isLoading || authLoading) {
    return (
      <div className="space-y-6 container mx-auto py-2">
        <Card className="shadow-lg">
            <CardHeader>
                <Skeleton className="h-8 w-2/5 rounded-md" />
                <Skeleton className="h-4 w-4/5 rounded-md mt-2" />
            </CardHeader>
            <CardContent className="p-0 md:p-2">
                <div className="space-y-2 p-4">
                    <Skeleton className="h-16 w-full rounded-md" />
                    <Skeleton className="h-16 w-full rounded-md" />
                    <Skeleton className="h-16 w-full rounded-md" />
                </div>
            </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-1 md:py-2">
      <IndicatorTable assignedIndicators={userIndicators} />
    </div>
  );
}
