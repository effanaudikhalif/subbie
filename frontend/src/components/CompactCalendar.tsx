"use client";
import React, { useState } from 'react';

interface CompactCalendarProps {
  value: { startDate: Date | null, endDate: Date | null };
  onChange: (range: { startDate: Date | null, endDate: Date | null }) => void;
  className?: string;
}

export default function CompactCalendar({ value, onChange, className = "" }: CompactCalendarProps) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  
  // Initialize month/year to show the start date if it exists, otherwise today
  const initialDate = value.startDate || today;
  const [month, setMonth] = useState(initialDate.getMonth());
  const [year, setYear] = useState(initialDate.getFullYear());

  // Generate days for the current month
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const firstDayWeekday = firstDayOfMonth.getDay();
  const calendarDays = [];
  for (let i = 0; i < firstDayWeekday; i++) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isAvailable = date >= today;
    let isSelected = false;
    let isStartDate = false;
    let isEndDate = false;

    // Always mark isStartDate if the date matches value.startDate
    if (value.startDate && date.getTime() === value.startDate.getTime()) {
      isStartDate = true;
    }
    // Always mark isEndDate if the date matches value.endDate
    if (value.endDate && date.getTime() === value.endDate.getTime()) {
      isEndDate = true;
    }

    // Range selection logic
    if (value.startDate && value.endDate) {
      isSelected = date >= value.startDate && date <= value.endDate;
    }
    // Show hover range when we have a start date but no end date yet
    if (value.startDate && !value.endDate && hoverDate && date > value.startDate && date <= hoverDate) {
      isSelected = true;
    }
    calendarDays.push({
      day,
      isAvailable,
      isSelected,
      isStartDate,
      isEndDate,
      date
    });
  }

  // Handle single date clicks for better UX
  function handleDateClick(dayData: any) {
    if (!dayData.isAvailable) return;
    
    // If no start date is selected, set it as check-in
    if (!value.startDate) {
      onChange({ startDate: dayData.date, endDate: null });
    }
    // If start date is selected but no end date, set end date (check-out)
    else if (value.startDate && !value.endDate) {
      if (dayData.date >= value.startDate) {
        onChange({ startDate: value.startDate, endDate: dayData.date });
      } else {
        // If selected date is before start date, make it the new start date
        onChange({ startDate: dayData.date, endDate: null });
      }
    }
    // If both dates are selected, start a new selection
    else {
      onChange({ startDate: dayData.date, endDate: null });
    }
  }

  // Handle hover for range preview
  function handleMouseEnter(dayData: any) {
    if (!dayData.isAvailable) return;
    
    // If we have a start date but no end date, show hover preview for future dates
    if (value.startDate && !value.endDate && dayData.date > value.startDate) {
      setHoverDate(dayData.date);
    }
  }

  // Clear hover when leaving calendar
  function handleMouseLeave() {
    setHoverDate(null);
  }

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-3 select-none w-[320px] ${className}`} onMouseLeave={handleMouseLeave}>
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="text-gray-400 hover:text-black px-2 py-1" disabled={month === today.getMonth() && year === today.getFullYear()}>&lt;</button>
        <div className="text-center text-sm font-medium text-gray-900">{new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        <button onClick={nextMonth} className="text-gray-400 hover:text-black px-2 py-1">&gt;</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-gray-500 py-1">{day}</div>
        ))}
        {calendarDays.map((dayData, index) => (
          <div
            key={index}
            className="text-center py-1"
            data-day={dayData?.day}
            onClick={dayData && dayData.isAvailable ? () => handleDateClick(dayData) : undefined}
            onMouseEnter={dayData && dayData.isAvailable ? () => handleMouseEnter(dayData) : undefined}
            style={{ cursor: dayData && dayData.isAvailable ? 'pointer' : 'default' }}
          >
            {dayData ? (
              <div className={
                `w-6 h-6 rounded-full flex items-center justify-center mx-auto
                ${dayData.isStartDate
                  ? 'bg-blue-600 text-white border-blue-700 font-semibold'
                  : dayData.isEndDate
                    ? 'bg-blue-600 text-white border-blue-700 font-semibold'
                    : dayData.isSelected
                      ? 'bg-blue-200 text-blue-800 border border-blue-300'
                      : dayData.isAvailable
                        ? 'hover:bg-gray-100 text-gray-800 border border-transparent'
                        : 'text-gray-400'}
                `
              }>
                {dayData.day}
              </div>
            ) : (
              <div className="w-6 h-6"></div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-600 text-center">
        <span className="inline-block w-3 h-3 bg-blue-500 border border-blue-600 rounded-full ml-4 mr-1"></span>
        Selected
      </div>
    </div>
  );
} 