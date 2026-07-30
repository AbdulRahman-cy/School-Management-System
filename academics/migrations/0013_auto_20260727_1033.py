from django.db import migrations

def backfill_seasons(apps, schema_editor):
    Term = apps.get_model('academics', 'Term')
    for term in Term.objects.all():
        # You can infer based on your existing naming convention or months
        if "spring" in term.name.lower() or term.start_date.month in [1, 2, 3]:
            term.season = "SPRING"
        elif "fall" in term.name.lower() or term.start_date.month in [8, 9, 10]:
            term.season = "FALL"
        else:
            term.season = "SUMMER"
        term.save()

class Migration(migrations.Migration):
    dependencies = [
        ('academics', '0012_term_season'),
    ]
    operations = [
        migrations.RunPython(backfill_seasons),
    ]