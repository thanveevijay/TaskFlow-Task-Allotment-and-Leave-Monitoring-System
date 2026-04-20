import { useCallback, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

type StatsSlideCarouselProps = {
  children: ReactNode;
  className?: string;
};

export function StatsSlideCarousel({ children, className }: StatsSlideCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: false,
    containScroll: "trimSnaps",
    dragFree: false,
  });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <div className={cn("relative group/slides", className)}>
      <div className="overflow-hidden rounded-xl" ref={emblaRef}>
        <div className="flex gap-4 pl-0.5 pr-1">
          {children}
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="absolute left-0 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full border border-border bg-card/95 shadow-md opacity-0 transition-opacity hover:bg-accent group-hover/slides:opacity-100 max-lg:opacity-100"
        onClick={scrollPrev}
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="absolute right-0 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full border border-border bg-card/95 shadow-md opacity-0 transition-opacity hover:bg-accent group-hover/slides:opacity-100 max-lg:opacity-100"
        onClick={scrollNext}
        aria-label="Next slide"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function StatsSlideItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "min-w-0 shrink-0 basis-[min(100%,320px)] sm:basis-[calc(50%-0.5rem)] lg:basis-[calc(25%-0.75rem)]",
        className
      )}
    >
      {children}
    </div>
  );
}
