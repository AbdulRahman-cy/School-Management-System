import os
import re

# Directories to ignore
IGNORE_DIRS = {'.git', 'venv', 'env', '__pycache__', 'migrations', 'node_modules'}

# Regex patterns to catch ORM lookups and direct attribute access
PATTERNS = [
    re.compile(r'course_class__term', re.IGNORECASE),
    re.compile(r'CourseClass\.objects\..*term=', re.IGNORECASE),
    re.compile(r'\.term\b(?!\s*\()'), # Catches obj.term but not obj.term()
]

def scan_project(root_dir):
    matches_found = 0
    
    print(f"Scanning project in {root_dir} for deprecated 'term' usages...\n")
    print("-" * 60)
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Modify dirnames in-place to skip ignored directories
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        
        for filename in filenames:
            if not filename.endswith('.py'):
                continue
                
            filepath = os.path.join(dirpath, filename)
            
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    
                for line_num, line in enumerate(lines, 1):
                    # We want to flag 'term' usage, but try to filter out obvious safe uses like term.name
                    if 'term' in line.lower():
                        for pattern in PATTERNS:
                            if pattern.search(line):
                                # Clean up whitespace for printing
                                clean_line = line.strip()
                                # Calculate relative path for cleaner output
                                rel_path = os.path.relpath(filepath, root_dir)
                                print(f"File: {rel_path} | Line {line_num}")
                                print(f"Code: {clean_line}\n")
                                matches_found += 1
                                break # Move to next line if one pattern matches
            except Exception as e:
                print(f"Could not read {filepath}: {e}")
                
    print("-" * 60)
    if matches_found == 0:
        print("✅ No obvious deprecated usages of CourseClass.term found!")
    else:
        print(f"⚠️ Found {matches_found} potential usages to review.")

if __name__ == '__main__':
    # Run from current directory
    current_dir = os.path.abspath(os.path.dirname(__file__))
    scan_project(current_dir)