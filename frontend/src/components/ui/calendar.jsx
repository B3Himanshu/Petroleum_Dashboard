import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useNavigation } from "react-day-picker";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// Custom Caption component with Today button and navigation
const CustomCaption = ({ displayMonth, goToToday }) => {
  const { goToMonth, nextMonth, previousMonth } = useNavigation();
  
  return (
    <div className="flex justify-between items-center px-1 pt-1 pb-3 relative">
      {/* Today button on the left */}
      <button
        onClick={() => goToToday()}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-medium rounded-md border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
        )}
      >
        Today
      </button>
      
      {/* Month/Year label in center */}
      <div className="flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
        <span className="text-xs sm:text-sm font-semibold text-foreground">
          {displayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
      </div>
      
      {/* Navigation buttons on the right */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => previousMonth && goToMonth(previousMonth)}
          disabled={!previousMonth}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-transparent hover:bg-accent hover:text-accent-foreground p-0 transition-all border-0",
            !previousMonth && "opacity-50 cursor-not-allowed"
          )}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
        <button
          onClick={() => nextMonth && goToMonth(nextMonth)}
          disabled={!nextMonth}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-transparent hover:bg-accent hover:text-accent-foreground p-0 transition-all border-0",
            !nextMonth && "opacity-50 cursor-not-allowed"
          )}
          aria-label="Next month"
        >
          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </div>
    </div>
  );
};

function Calendar({ className, classNames, showOutsideDays = true, ...props }) {
  const [currentMonth, setCurrentMonth] = React.useState(props.defaultMonth || new Date());

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      month={currentMonth}
      onMonthChange={setCurrentMonth}
      className={cn("p-3 sm:p-4 lg:p-6", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-6 sm:space-x-6 sm:space-y-0",
        month: "space-y-2 sm:space-y-3",
        caption: "flex justify-center pt-1 pb-2 sm:pb-3 relative items-center",
        caption_label: "text-xs sm:text-sm font-semibold text-foreground",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-transparent hover:bg-accent hover:text-accent-foreground p-0 transition-all border-0"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex mb-1",
        head_cell: "text-muted-foreground w-8 h-8 sm:w-10 sm:h-10 font-medium text-[10px] sm:text-xs flex items-center justify-center",
        row: "flex w-full mt-1",
        cell: "h-8 w-8 sm:h-10 sm:w-10 text-center text-xs sm:text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-transparent [&:has([aria-selected])]:bg-emerald-500/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }), 
          "h-8 w-8 sm:h-10 sm:w-10 p-0 font-normal rounded-md transition-all hover:bg-accent hover:text-accent-foreground aria-selected:opacity-100 text-xs sm:text-sm"
        ),
        day_range_end: "day-range-end rounded-r-md",
        day_selected:
          "bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-500 focus:text-white font-medium rounded-md shadow-sm",
        day_today: "bg-accent/50 text-accent-foreground font-medium border border-border",
        day_outside:
          "day-outside text-muted-foreground opacity-40 aria-selected:bg-emerald-500/30 aria-selected:text-white aria-selected:opacity-100",
        day_disabled: "text-muted-foreground opacity-30 cursor-not-allowed hover:bg-transparent",
        day_range_middle: "aria-selected:bg-emerald-500/20 aria-selected:text-foreground rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        Caption: (captionProps) => (
          <CustomCaption 
            {...captionProps} 
            goToToday={goToToday}
          />
        ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
