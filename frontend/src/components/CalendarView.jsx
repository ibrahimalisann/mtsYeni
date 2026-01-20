import { useMemo, useState } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ReservationDetailModal from './ReservationDetailModal';

// Status-based colors
const getStatusColor = (status) => {
    switch (status) {
        case 'pending':
            return 'bg-orange-100 text-orange-800 border-orange-300';
        case 'confirmed':
            return 'bg-teal-100 text-teal-800 border-teal-300';
        case 'upcoming':
            return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'active':
            return 'bg-green-100 text-green-800 border-green-300';
        case 'completed':
            return 'bg-gray-100 text-gray-700 border-gray-300';
        case 'cancelled':
            return 'bg-red-100 text-red-700 border-red-300';
        default:
            return 'bg-blue-100 text-blue-700 border-blue-300';
    }
};

const getStatusLabel = (status) => {
    switch (status) {
        case 'pending': return 'Onay Bekliyor';
        case 'confirmed': return 'Onaylandı';
        case 'upcoming': return 'Gelecek';
        case 'active': return 'Konaklıyor';
        case 'completed': return 'Tamamlandı';
        case 'cancelled': return 'İptal';
        default: return status;
    }
};

const CalendarView = ({ reservations, onUpdate }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedReservation, setSelectedReservation] = useState(null);

    const daysInMonth = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [currentDate]);

    // Data structure: map date -> { occupancy, reservations: [] }
    const dayData = useMemo(() => {
        const map = {};

        daysInMonth.forEach(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayRes = [];
            let occupancy = 0;

            reservations.forEach(res => {
                // Show all except cancelled
                if (res.status === 'cancelled') return;

                const start = new Date(res.checkInDate);
                const end = new Date(res.checkOutDate);
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                const current = new Date(day);
                current.setHours(0, 0, 0, 0);

                if (current >= start && current < end) {
                    dayRes.push(res);
                    occupancy += res.guestCount;
                }
            });

            // Sort by check-in date to keep order consistent
            dayRes.sort((a, b) => new Date(a.checkInDate) - new Date(b.checkInDate));

            map[dayKey] = { occupancy, reservations: dayRes };
        });

        return map;
    }, [daysInMonth, reservations]);

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const handleReservationUpdate = (updated) => {
        if (onUpdate) onUpdate(updated);
        setSelectedReservation(null);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 capitalize">
                    {format(currentDate, 'MMMM yyyy', { locale: tr })}
                </h2>
                <div className="flex gap-2">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-full">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-full">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                {/* Headers */}
                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
                    <div key={day} className="bg-gray-50 p-2 text-center text-xs font-semibold text-gray-500 uppercase">
                        {day}
                    </div>
                ))}

                {/* Days */}
                {daysInMonth.map(day => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const { occupancy, reservations: dayReservations } = dayData[dayKey] || { occupancy: 0, reservations: [] };
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isCurrentDay = isToday(day);

                    const MAX_CAPACITY = 9;
                    const isFull = occupancy >= MAX_CAPACITY;

                    return (
                        <div key={dayKey} className={`bg-white min-h-[140px] p-2 flex flex-col group hover:bg-gray-50 transition-colors ${!isCurrentMonth ? 'bg-gray-50/50 text-gray-400' : ''}`}>
                            {/* Header: Date and Total Occupancy */}
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isCurrentDay ? 'bg-indigo-600 text-white' : ''}`}>
                                    {format(day, 'd')}
                                </span>
                                {occupancy > 0 && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isFull ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        {occupancy}/9
                                    </span>
                                )}
                            </div>

                            {/* Reservation Bars */}
                            <div className="flex-1 flex flex-col gap-1">
                                {dayReservations.map((res) => {
                                    const colorClass = getStatusColor(res.status);
                                    const statusLabel = getStatusLabel(res.status);
                                    const guest = res.guest || {};

                                    // Logic for visual continuity
                                    const start = new Date(res.checkInDate); start.setHours(0, 0, 0, 0);
                                    const end = new Date(res.checkOutDate); end.setHours(0, 0, 0, 0);
                                    const current = new Date(day); current.setHours(0, 0, 0, 0);

                                    const isStart = isSameDay(current, start);
                                    // Last night of stay is the day before check-out
                                    const nextDay = addDays(current, 1);
                                    const isEnd = isSameDay(nextDay, end);

                                    return (
                                        <div
                                            key={res._id}
                                            onClick={() => setSelectedReservation(res)}
                                            className={`
                                                text-[10px] px-1.5 py-1 border overflow-hidden cursor-pointer
                                                hover:shadow-md hover:z-20 transition-shadow
                                                ${colorClass}
                                                ${isStart ? 'rounded-l-md ml-0' : '-ml-2 border-l-0'} 
                                                ${isEnd ? 'rounded-r-md mr-0' : '-mr-2 border-r-0'}
                                                relative z-10
                                            `}
                                            title={`${guest.firstName} ${guest.lastName} (${res.guestCount}) - ${statusLabel}`}
                                        >
                                            <div className="flex flex-col font-semibold leading-tight">
                                                {isStart && (
                                                    <>
                                                        <span className="truncate">{guest.firstName} {guest.lastName}</span>
                                                        <span className="text-[9px] font-bold opacity-90">{statusLabel}</span>
                                                    </>
                                                )}
                                                {!isStart && (
                                                    <span className="text-[9px] opacity-75">{statusLabel}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend / Info */}
            <div className="mt-4 flex items-center justify-end gap-4 text-xs">
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-300"></span> Onay Bekliyor</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-teal-100 border border-teal-300"></span> Onaylandı</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300"></span> Konaklıyor</div>
            </div>

            {/* Detail Modal */}
            {selectedReservation && (
                <ReservationDetailModal
                    reservation={selectedReservation}
                    onClose={() => setSelectedReservation(null)}
                    onUpdate={handleReservationUpdate}
                />
            )}
        </div>
    );
};

export default CalendarView;
