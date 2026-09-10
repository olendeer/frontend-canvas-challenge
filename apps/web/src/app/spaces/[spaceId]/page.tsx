import { Suspense } from 'react';

import { CanvasModule } from 'features/canvas';

interface CanvasPageProps {
  params: Promise<{ spaceId: string }>;
}

const CanvasPage = async ({ params }: CanvasPageProps) => {
  const { spaceId } = await params;

  return (
    <Suspense>
      <CanvasModule spaceId={spaceId} />
    </Suspense>
  );
};

export default CanvasPage;
