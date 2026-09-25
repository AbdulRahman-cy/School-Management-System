from django.db import migrations, models

def backfill_seats_taken(apps, schema_editor):
    CourseClass = apps.get_model("academics", "CourseClass")
    Enrollment = apps.get_model("records", "Enrollment")
    from django.db.models import Count

    counts = dict(
        Enrollment.objects.filter(status="ENROLLED")
        .values("course_class_id").annotate(c=Count("id"))
        .values_list("course_class_id", "c")
    )
    classes = list(CourseClass.objects.all())
    for cc in classes:
    CourseClass.objects.bulk_update(classes, ["seats_taken"])

class Migration(migrations.Migration):
    dependencies = [("academics", "0025_courseclass_schedule_dirty")]  
    operations = [
        migrations.AddField(
            model_name="courseclass", name="seats_taken",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.RunPython(backfill_seats_taken, migrations.RunPython.noop),
    ]