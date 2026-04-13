from django.contrib import admin

from users.models import BaseUser, StudentProfile, TeacherProfile

# Register your models here.

admin.site.register(BaseUser)
admin.site.register(StudentProfile)
admin.site.register(TeacherProfile)
