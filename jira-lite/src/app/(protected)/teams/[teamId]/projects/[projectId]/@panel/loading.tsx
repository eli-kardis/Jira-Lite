import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    // 1. 실제 패널(Sheet)과 똑같은 위치/크기/배경을 강제로 잡음 (Wrapper)
    <div className="fixed inset-y-0 right-0 z-50 h-full w-full border-l bg-white shadow-lg transition-transform sm:max-w-[500px] lg:max-w-[600px] p-6 flex flex-col gap-6">

      {/* 2. 헤더 스켈레톤 (제목 + 닫기버튼 위치) */}
      <div className="flex items-start justify-between">
        <div className="space-y-2 w-3/4">
          <Skeleton className="h-4 w-20" /> {/* Breadcrumb 흉내 */}
          <Skeleton className="h-8 w-full" /> {/* 이슈 제목 */}
        </div>
        <Skeleton className="h-8 w-8 rounded-md" /> {/* 닫기 버튼 흉내 */}
      </div>

      {/* 3. 본문 스켈레톤 (2단 컬럼 구조) */}
      <div className="flex flex-col lg:flex-row gap-8 h-full">
        {/* 왼쪽: 메인 컨텐츠 */}
        <div className="flex-1 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[95%]" />
            <Skeleton className="h-4 w-[80%]" />
          </div>

          {/* 댓글 영역 흉내 */}
          <div className="mt-8 space-y-4">
            <Skeleton className="h-6 w-24" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 메타 데이터 (사이드바) */}
        <div className="w-full lg:w-[180px] space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-16" /> {/* 라벨: 상태 */}
            <Skeleton className="h-10 w-full" /> {/* Select Box */}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-16" /> {/* 라벨: 담당자 */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-16" /> {/* 라벨: 우선순위 */}
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
