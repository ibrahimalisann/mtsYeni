import { User, Phone, Mail, Calendar, MapPin, BedDouble, AlertTriangle } from 'lucide-react';

const GuestCard = ({ reservation, onRoomAssign, showButton = true, compact = false }) => {
    const guest = reservation.guest || {};
    const registrar = reservation.registrar || {};

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('tr-TR');

    // Check if all guests are assigned to rooms
    const isFullyAssigned = () => {
        if (!reservation.roomAssignments || reservation.roomAssignments.length === 0) {
            return reservation.assignedRooms && reservation.assignedRooms.length > 0;
        }
        const totalAssigned = reservation.roomAssignments.reduce((sum, a) => sum + a.guestCount, 0);
        return totalAssigned >= reservation.guestCount;
    };

    const needsRoomAssignment = !isFullyAssigned() &&
        (reservation.status === 'confirmed' || reservation.status === 'active');

    if (compact) {
        // Compact version for tooltip/popover display
        return (
            <div className="p-3 text-sm">
                <div className="font-semibold text-gray-800">
                    {guest.firstName} {guest.lastName}
                </div>
                {reservation.guestCount > 1 && (
                    <div className="text-xs text-gray-500">{reservation.guestCount} Kişi</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                    {formatDate(reservation.checkInDate)} → {formatDate(reservation.checkOutDate)}
                </div>
                {(registrar?.city || registrar?.country) && (
                    <div className="text-xs text-gray-400 mt-0.5">
                        📍 {registrar.city}{registrar.city && registrar.country && ' / '}{registrar.country}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            className={`bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow ${needsRoomAssignment
                    ? 'border-2 border-orange-300'
                    : 'border border-gray-100'
                }`}
        >
            {/* Card Header */}
            <div className={`p-4 border-b ${needsRoomAssignment
                    ? 'bg-orange-50 border-orange-100'
                    : 'bg-indigo-50 border-indigo-100'
                }`}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${needsRoomAssignment
                                ? 'bg-orange-100 text-orange-600'
                                : 'bg-indigo-100 text-indigo-600'
                            }`}>
                            {needsRoomAssignment ? (
                                <AlertTriangle className="w-5 h-5" />
                            ) : (
                                <User className="w-5 h-5" />
                            )}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800">{guest.firstName} {guest.lastName}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${needsRoomAssignment
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-indigo-100 text-indigo-700'
                                }`}>
                                Grup Başkanı
                            </span>
                        </div>
                    </div>
                    {reservation.guestCount > 1 && (
                        <span className={`text-xs px-2 py-1 rounded-full ${needsRoomAssignment
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                            {reservation.guestCount} Kişi
                        </span>
                    )}
                </div>
            </div>

            {/* Card Body */}
            <div className="p-4 space-y-3">
                {/* Contact */}
                <div className="flex flex-col gap-1 text-sm">
                    {guest.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {guest.phone}
                        </div>
                    )}
                    {guest.email && (
                        <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {guest.email}
                        </div>
                    )}
                </div>

                {/* Dates */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    <span>{formatDate(reservation.checkInDate)}</span>
                    <span className="text-gray-400">→</span>
                    <span>{formatDate(reservation.checkOutDate)}</span>
                </div>

                {/* Registrar Location */}
                {(registrar?.city || registrar?.country) && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="w-4 h-4 text-orange-400" />
                        {registrar.city}
                        {registrar.city && registrar.country && ' / '}
                        {registrar.country}
                    </div>
                )}

                {/* Assigned Rooms */}
                <div className="flex items-center gap-2 flex-wrap">
                    <BedDouble className={`w-4 h-4 ${needsRoomAssignment ? 'text-orange-500' : 'text-indigo-500'}`} />
                    {reservation.roomAssignments && reservation.roomAssignments.length > 0 ? (
                        reservation.roomAssignments.map((assignment, idx) => (
                            <span key={idx} className={`text-xs px-2 py-0.5 rounded-full ${needsRoomAssignment
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-indigo-100 text-indigo-700'
                                }`}>
                                {assignment.roomName} ({assignment.guestCount})
                            </span>
                        ))
                    ) : reservation.assignedRooms && reservation.assignedRooms.length > 0 ? (
                        reservation.assignedRooms.map((room, idx) => (
                            <span key={idx} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                {room}
                            </span>
                        ))
                    ) : (
                        <span className="text-xs text-orange-500 font-medium">⚠ Oda atanmamış</span>
                    )}
                </div>

                {/* Room Assign Button */}
                {showButton && (reservation.status === 'confirmed' || reservation.status === 'active') && onRoomAssign && (
                    <button
                        onClick={() => onRoomAssign(reservation)}
                        className={`w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${needsRoomAssignment
                                ? 'bg-orange-500 text-white hover:bg-orange-600'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                    >
                        <BedDouble className="w-4 h-4" />
                        {(reservation.roomAssignments?.length > 0 || reservation.assignedRooms?.length > 0)
                            ? 'Odaları Değiştir'
                            : 'Oda Ata'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default GuestCard;
