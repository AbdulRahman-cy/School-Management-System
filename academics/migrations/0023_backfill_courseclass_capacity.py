from django.db import migrations, models
from django.db.models import F

def backfill_capacity(apps, schema_editor):
    CourseClass = apps.get_model('academics', 'CourseClass')
    
    classes_to_update = []
    # select_related fetches the group data in the same query to avoid N+1 issues
    for cc in CourseClass.objects.select_related('group').all():
        if cc.group:
            cc.capacity = cc.group.capacity
            classes_to_update.append(cc)
            
    if classes_to_update:
        # bulk_update pushes all changes in a single query, keeping it performant
        CourseClass.objects.bulk_update(classes_to_update, ['capacity'])

def reverse_backfill(apps, schema_editor):
    # Optional: logic to run if you rollback this migration
    CourseClass = apps.get_model('academics', 'CourseClass')
    CourseClass.objects.update(capacity=None)

class Migration(migrations.Migration):

    dependencies = [
        # This should automatically point to the schema migration you made in Step 2
        ('academics', '0022_courseclass_capacity'), 
    ]

    operations = [
        migrations.RunPython(backfill_capacity, reverse_backfill),
    ]