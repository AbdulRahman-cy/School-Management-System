from rest_framework import serializers

from academics.api.serializers.dashboard_common import DashboardClassRowSerializer


class TeacherDashboardClassRowSerializer(DashboardClassRowSerializer):
    """
    Extends the shared class row with this class's scheduled sessions, so a
    teacher can see their own timetable at a glance. `obj.sessions` must be
    prefetched (see TeacherDashboardView) to avoid a per-row query.
    """
    sessions = serializers.SerializerMethodField()

    class Meta(DashboardClassRowSerializer.Meta):
        fields = DashboardClassRowSerializer.Meta.fields + ["sessions"]

    def get_sessions(self, obj):
        return [
            {
                "session_type": session.session_type,
                "day": session.timeslot.day,
                "day_display": session.timeslot.get_day_display(),
                "period": session.timeslot.period,
                "period_display": session.timeslot.get_period_display(),
                "room_code": session.room.code,
            }
            for session in obj.sessions.all()
        ]
