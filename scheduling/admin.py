from django.contrib import admin

from scheduling.models import CourseClass, ClassSession

# Register your models here.

admin.site.register(CourseClass)
admin.site.register(ClassSession)