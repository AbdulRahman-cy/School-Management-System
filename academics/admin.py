from django.contrib import admin

from academics.models import Department, Course, Term, Discipline

# Register your models here.

admin.site.register(Department)
admin.site.register(Course)
admin.site.register(Term)
admin.site.register(Discipline)

