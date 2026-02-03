import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from '../axiosConfig';
import { X, BedDouble, User, Users, GripVertical, ChevronDown, FileText, Download, FileSpreadsheet, File as FileIcon, Image } from 'lucide-react';
import {
    DndContext,
    DragOverlay,
    closestCenter,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';

const DraggableGuest = ({ id, guest, index, sourceRoom = null }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: id,
        data: { guest, index, sourceRoom }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
    } : undefined;

    const isAnonymous = guest.isAnonymous;

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                touchAction: 'none'
            }}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-move transition-all ${isDragging
                ? 'shadow-lg border-indigo-500 z-50 bg-white border-2'
                : isAnonymous
                    ? 'bg-gray-100 border-2 border-dashed border-gray-300 hover:border-gray-400'
                    : 'bg-white border-2 border-gray-200 hover:border-indigo-400'
                }`}
            {...listeners}
            {...attributes}
        >
            <GripVertical className={`w-4 h-4 ${isAnonymous ? 'text-gray-400' : 'text-gray-500'}`} />
            <div className="flex-1">
                <div className={`font-medium text-sm ${isAnonymous ? 'text-gray-600' : 'text-gray-900'}`}>
                    {guest.firstName} {guest.lastName}
                    {index === 0 && (
                        <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                            Grup Başkanı
                        </span>
                    )}
                    {isAnonymous && (
                        <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                            Bilgi yok
                        </span>
                    )}
                </div>
                <div className={`text-xs ${isAnonymous ? 'text-gray-500 italic' : 'text-gray-500'}`}>
                    {guest.nevi || 'Nevi belirtilmemiş'}
                </div>
            </div>
        </div>
    );
};

const DroppableRoom = ({ room, assignedGuests, occupancyInfo, isCollapsed, onToggle }) => {
    // Local state removed, controlled by parent

    const { setNodeRef, isOver } = useDroppable({
        id: room.name,
        data: { room }
    });

    const info = occupancyInfo[room.name] || { capacity: room.capacity, available: room.capacity, occupiedByOthers: 0 };
    const assignedCount = assignedGuests.length;
    const isFull = assignedCount >= info.available;
    const occupancyPercent = Math.round(((info.occupiedByOthers + assignedCount) / room.capacity) * 100);

    return (
        <div
            ref={setNodeRef}
            className={`p-4 rounded-xl border-2 transition-all ${isCollapsed ? 'min-h-0' : 'min-h-[120px]'
                } ${isOver && !isFull
                    ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                    : assignedCount > 0
                        ? 'border-indigo-300 bg-indigo-50/50'
                        : isFull
                            ? 'border-red-200 bg-red-50/50'
                            : 'border-gray-200 bg-gray-50'
                }`}
        >
            {/* Room Header - Clickable */}
            <div
                className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 cursor-pointer hover:bg-white/50 -mx-4 -mt-4 px-4 pt-4 rounded-t-xl transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2 flex-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${assignedCount > 0
                        ? 'bg-indigo-600 text-white'
                        : isFull
                            ? 'bg-red-100 text-red-600'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                        <BedDouble className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm">{room.name}</div>
                        <div className="text-xs text-gray-500">
                            {room.capacity} Yatak • {info.available - assignedCount} Boş
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-lg font-bold text-indigo-600">
                        {assignedCount}
                    </div>
                    <ChevronDown
                        className={`w-5 h-5 text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''
                            }`}
                    />
                </div>
            </div>

            {/* Collapsible Content */}
            {!isCollapsed && (
                <>
                    {/* Occupancy Bar */}
                    <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Doluluk</span>
                            <span>{info.occupiedByOthers + assignedCount}/{room.capacity}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all ${occupancyPercent >= 100 ? 'bg-red-500' :
                                    occupancyPercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                                    }`}
                                style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                            />
                        </div>
                    </div>



                    {/* Assigned Guests */}
                    <div className="space-y-2">
                        {assignedGuests.map((guest, idx) => (
                            <DraggableGuest
                                key={guest.id || idx}
                                id={guest.id}
                                guest={guest}
                                index={idx}
                                sourceRoom={room.name}
                            />
                        ))}
                        {assignedCount === 0 && (
                            <div className="text-center text-xs text-gray-400 py-4 border border-dashed border-gray-300 rounded-lg">
                                Misafir sürükleyin
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

const UnassignedZone = () => {
    const { setNodeRef, isOver } = useDroppable({
        id: 'unassigned',
    });

    return (
        <div
            ref={setNodeRef}
            className={`mt-4 p-3 rounded-lg border-2 border-dashed transition-all ${isOver ? 'border-gray-400 bg-gray-100' : 'border-gray-300 bg-gray-50'
                }`}
        >
            <div className="text-center text-xs text-gray-500">
                Atamayı iptal etmek için buraya sürükleyin
            </div>
        </div>
    );
};

const RoomAssignModal = ({ reservation, onClose, onUpdate }) => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [occupancyInfo, setOccupancyInfo] = useState({});
    const [activeId, setActiveId] = useState(null);
    const [collapsedRooms, setCollapsedRooms] = useState({});

    // Guest assignments: { "guest-0": "Ferah", "guest-1": null, ... }
    const [assignments, setAssignments] = useState({});

    // Toggle specific room collapse
    const toggleRoom = (roomId, e) => {
        if (e) {
            e.stopPropagation();
        }
        setCollapsedRooms(prev => ({
            ...prev,
            [roomId]: !prev[roomId]
        }));
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200,
                tolerance: 8,
            },
        })
    );

    // Build guest list from reservation
    const allGuests = [];
    const totalGuestCount = reservation?.guestCount || 1;

    // Add group leader (main guest)
    if (reservation?.guest) {
        allGuests.push({
            ...reservation.guest,
            id: 'guest-0',
            index: 0,
            isAnonymous: false
        });
    }

    // Add additional guests with details
    if (reservation?.additionalGuests) {
        reservation.additionalGuests.forEach((guest, idx) => {
            allGuests.push({
                ...guest,
                id: `guest-${idx + 1}`,
                index: idx + 1,
                isAnonymous: false
            });
        });
    }

    // Fill remaining slots with anonymous guests if guestCount > actual guests
    const actualGuestCount = allGuests.length;
    if (totalGuestCount > actualGuestCount) {
        const remainingCount = totalGuestCount - actualGuestCount;
        for (let i = 0; i < remainingCount; i++) {
            const guestIndex = actualGuestCount + i;
            allGuests.push({
                firstName: `Misafir`,
                lastName: `#${guestIndex + 1}`,
                id: `guest-${guestIndex}`,
                index: guestIndex,
                isAnonymous: true,
                nevi: 'Bilgi girilmedi'
            });
        }
    }

    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        if (reservation) {
            fetchRoomsWithOccupancy();
            initializeAssignments();
        }
    }, [reservation]);

    const initializeAssignments = () => {
        // Try to distribute based on existing roomAssignments
        if (reservation.roomAssignments && reservation.roomAssignments.length > 0) {
            const newAssignments = {};
            let guestIndex = 0;

            reservation.roomAssignments.forEach(assignment => {
                for (let i = 0; i < assignment.guestCount; i++) {
                    if (guestIndex < allGuests.length) {
                        newAssignments[`guest-${guestIndex}`] = assignment.roomName;
                        guestIndex++;
                    }
                }
            });

            setAssignments(newAssignments);
        }
    };

    const fetchRoomsWithOccupancy = async () => {
        setLoading(true);
        try {
            const roomsRes = await axios.get('/rooms/active');
            setRooms(roomsRes.data);

            const occupancyRes = await axios.get('/rooms/occupancy', {
                params: {
                    startDate: reservation.checkInDate,
                    endDate: reservation.checkOutDate
                }
            });

            const info = {};
            occupancyRes.data.forEach(roomOcc => {
                const otherReservations = roomOcc.reservations.filter(
                    r => r._id !== reservation._id
                );

                let occupiedBeds = 0;
                otherReservations.forEach(res => {
                    if (res.roomAssignments) {
                        const assignment = res.roomAssignments.find(a => a.roomName === roomOcc.room.name);
                        if (assignment) {
                            occupiedBeds += assignment.guestCount;
                        }
                    }
                });

                info[roomOcc.room.name] = {
                    capacity: roomOcc.room.capacity,
                    occupiedByOthers: occupiedBeds,
                    available: roomOcc.room.capacity - occupiedBeds
                };
            });
            setOccupancyInfo(info);
        } catch (error) {
            console.error('Error fetching rooms:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const guestId = active.id;
        const targetRoomName = over.id === 'unassigned' ? null : over.id;

        // If dropping in the same place, do nothing
        if (assignments[guestId] === targetRoomName) {
            return;
        }

        // Check capacity if dropping on a room
        if (targetRoomName && targetRoomName !== 'unassigned') {
            const room = rooms.find(r => r.name === targetRoomName);
            const info = occupancyInfo[targetRoomName];
            const currentAssigned = Object.values(assignments).filter(r => r === targetRoomName).length;

            if (currentAssigned >= info.available) {
                return; // Room is full
            }
        }

        setAssignments(prev => ({
            ...prev,
            [guestId]: targetRoomName
        }));
    };

    const getGuestsByRoom = (roomName) => {
        return allGuests.filter(guest => assignments[guest.id] === roomName);
    };

    const getUnassignedGuests = () => {
        return allGuests.filter(guest => !assignments[guest.id]);
    };

    const getAssignedCount = () => {
        return Object.values(assignments).filter(r => r !== null && r !== undefined).length;
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Convert assignments to roomAssignments format
            const roomCounts = {};
            Object.values(assignments).forEach(roomName => {
                if (roomName) {
                    roomCounts[roomName] = (roomCounts[roomName] || 0) + 1;
                }
            });

            const roomAssignments = Object.entries(roomCounts).map(([roomName, guestCount]) => ({
                roomName,
                guestCount
            }));

            const assignedRooms = roomAssignments.map(a => a.roomName);

            const res = await axios.put(`/reservations/${reservation._id}`, {
                assignedRooms,
                roomAssignments
            });
            onUpdate(res.data);
            onClose();
        } catch (error) {
            console.error('Error assigning rooms:', error);
            alert('Oda atama işlemi başarısız: ' + (error.response?.data?.message || ''));
        } finally {
            setSaving(false);
        }
    };

    if (!reservation) return null;

    const assignedCount = getAssignedCount();
    const totalGuests = allGuests.length;
    const unassignedGuests = getUnassignedGuests();

    const activeGuest = activeId ? allGuests.find(g => g.id === activeId) : null;

    return createPortal(
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] sm:flex sm:items-center sm:justify-center p-0 sm:p-4">
                <div className="bg-white rounded-none sm:rounded-xl shadow-xl max-w-6xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="p-3 sm:p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <BedDouble className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                                    <span className="hidden sm:inline">Misafirleri Odalara Yerleştir</span>
                                    <span className="sm:hidden">Oda Atama</span>
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                                    {reservation.guest?.firstName} {reservation.guest?.lastName} • {totalGuests} Kişi
                                </p>
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="px-3 sm:px-4 py-2 sm:py-3 bg-indigo-50 border-b flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:justify-between">
                        <div className="text-xs sm:text-sm">
                            <span className="font-medium text-indigo-900">İlerleme:</span>{' '}
                            <span className="text-indigo-700">{assignedCount} / {totalGuests}</span>
                        </div>
                        <div className="flex-1 w-full sm:mx-4 sm:max-w-xs">
                            <div className="h-2 bg-indigo-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-600 transition-all"
                                    style={{ width: `${(assignedCount / totalGuests) * 100}%` }}
                                />
                            </div>
                        </div>
                        <div className={`text-xs sm:text-sm font-medium ${assignedCount === totalGuests ? 'text-green-600' : 'text-orange-600'}`}>
                            {assignedCount === totalGuests ? '✓ Tamamlandı' : `${totalGuests - assignedCount} kaldı`}
                        </div>
                    </div>

                    {/* Date Info */}
                    <div className="px-3 sm:px-4 py-2 bg-gray-50 border-b text-xs sm:text-sm text-gray-600">
                        <span className="font-medium">Konaklama:</span>{' '}
                        <span className="hidden sm:inline">{new Date(reservation.checkInDate).toLocaleDateString('tr-TR')} → {new Date(reservation.checkOutDate).toLocaleDateString('tr-TR')}</span>
                        <span className="sm:hidden">{new Date(reservation.checkInDate).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })} → {new Date(reservation.checkOutDate).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}</span>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                        {loading ? (
                            <div className="flex-1 flex items-center justify-center text-gray-500">
                                Yükleniyor...
                            </div>
                        ) : (
                            <>
                                {/* Left Panel - Guests */}
                                <div className="w-full md:w-2/5 border-b md:border-b-0 md:border-r border-gray-200 p-3 sm:p-4 overflow-y-auto max-h-64 md:max-h-none">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                                        <h4 className="font-semibold text-gray-800 text-sm sm:text-base">
                                            <span className="hidden sm:inline">Misafirler ({unassignedGuests.length} atanmadı)</span>
                                            <span className="sm:hidden">Misafirler ({unassignedGuests.length})</span>
                                        </h4>
                                    </div>
                                    {/* Ek-1 File Download Button */}
                                    {reservation.ek1FilePath && (() => {
                                        const ext = reservation.ek1FilePath.split('.').pop().toLowerCase();
                                        let FileIconComponent = FileText;
                                        let fileLabel = 'Dosya Mevcut';
                                        let iconColor = 'text-blue-600';

                                        if (['xls', 'xlsx', 'csv'].includes(ext)) {
                                            FileIconComponent = FileSpreadsheet;
                                            fileLabel = 'Excel Dosyası';
                                            iconColor = 'text-green-600';
                                        } else if (['pdf'].includes(ext)) {
                                            FileIconComponent = FileText;
                                            fileLabel = 'PDF Dosyası';
                                            iconColor = 'text-red-600';
                                        } else if (['doc', 'docx'].includes(ext)) {
                                            FileIconComponent = FileText;
                                            fileLabel = 'Word Dosyası';
                                            iconColor = 'text-blue-600';
                                        } else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
                                            FileIconComponent = Image;
                                            fileLabel = 'Resim Dosyası';
                                            iconColor = 'text-purple-600';
                                        } else {
                                            FileIconComponent = FileIcon;
                                        }

                                        return (
                                            <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-2 bg-gray-50 rounded-lg ${iconColor}`}>
                                                        <FileIconComponent className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{fileLabel}</div>
                                                        <div className="text-xs text-gray-500 uppercase">{ext}</div>
                                                    </div>
                                                </div>
                                                <a
                                                    href={`${(() => {
                                                        // Determine backend URL dinamically
                                                        const apiUrl = import.meta.env.VITE_API_URL;
                                                        if (apiUrl) {
                                                            return apiUrl.replace('/api', '');
                                                        }
                                                        // Fallback for local dev
                                                        return `${window.location.protocol}//${window.location.hostname}:5000`;
                                                    })()}/${reservation.ek1FilePath.replace(/\\/g, '/')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-md transition-colors"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    İndir
                                                </a>
                                            </div>
                                        );
                                    })()}

                                    <div className="space-y-2">
                                        {unassignedGuests.map((guest) => (
                                            <DraggableGuest
                                                key={guest.id}
                                                id={guest.id}
                                                guest={guest}
                                                index={guest.index}
                                            />
                                        ))}
                                        {unassignedGuests.length === 0 && (
                                            <div className="text-center text-xs sm:text-sm text-green-600 py-4 sm:py-8 bg-green-50 rounded-lg border border-green-200">
                                                ✓ Tüm misafirler yerleştirildi
                                            </div>
                                        )}
                                    </div>
                                    <UnassignedZone />
                                </div>

                                {/* Right Panel - Rooms */}
                                <div className="flex-1 p-3 sm:p-4 overflow-y-auto bg-gray-50">
                                    <div className="flex items-center gap-2 mb-3">
                                        <BedDouble className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                                        <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Odalar</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-start">
                                        {rooms.map((room) => (
                                            <DroppableRoom
                                                key={room._id}
                                                room={room}
                                                assignedGuests={getGuestsByRoom(room.name)}
                                                occupancyInfo={occupancyInfo}
                                                isCollapsed={!!collapsedRooms[room._id]}
                                                onToggle={(e) => toggleRoom(room._id, e)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2 sm:gap-3">
                        <button
                            onClick={onClose}
                            className="px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || assignedCount < totalGuests}
                            className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
                {activeGuest ? (
                    <div className="flex items-center gap-3 p-3 bg-white border-2 border-indigo-500 rounded-lg shadow-2xl">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <div>
                            <div className="font-medium text-gray-900 text-sm">
                                {activeGuest.firstName} {activeGuest.lastName}
                            </div>
                            {activeGuest.nevi && (
                                <div className="text-xs text-gray-500">{activeGuest.nevi}</div>
                            )}
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>,
        document.body
    );
};

export default RoomAssignModal;
