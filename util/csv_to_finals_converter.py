#!/usr/bin/env python3
"""
CSV to Finals Simulator Converter

This script converts CSV files with question data into the JSON format
required by the Finals Simulator application.

CSV Format Expected:
- Question Text, Question Type, Option 1, Option 2, Option 3, Option 4, Option 5, 
  Correct Answer, Time in seconds, Image Link, Answer explanation

Author: Finals Simulator Team
"""

import csv
import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional

def get_user_input() -> Dict[str, Any]:
    """Get metadata and configuration from user input."""
    print("=== Finals Simulator CSV Converter ===\n")
    
    # Basic metadata
    name = input("Enter question set name: ").strip()
    if not name:
        name = "Imported Question Set"
    
    subject = input("Enter subject (optional): ").strip()
    if not subject:
        subject = "General"
    
    # Test settings
    print("\n=== Test Configuration ===")
    time_limit = input("Enter time limit in minutes (leave blank for no limit): ").strip()
    time_limit_minutes = None
    if time_limit:
        try:
            time_limit_minutes = int(time_limit)
        except ValueError:
            print("Invalid time limit, setting to no limit")
    
    allow_answer_change = input("Allow answer changes during test? (y/n, default: y): ").strip().lower()
    allow_answer_change = allow_answer_change != 'n'
    
    show_results = input("Show results immediately after test? (y/n, default: y): ").strip().lower()
    show_results = show_results != 'n'
    
    # Bank configuration
    print("\n=== Question Bank Configuration ===")
    create_bank = input("Create as a question bank? (y/n, default: n): ").strip().lower()
    create_bank = create_bank == 'y'
    
    bank_name = None
    questions_to_select = None
    
    if create_bank:
        bank_name = input("Enter bank name: ").strip()
        if not bank_name:
            bank_name = f"{name} Bank"
        
        questions_to_select_input = input("How many questions to select from the bank? ").strip()
        try:
            questions_to_select = int(questions_to_select_input)
            if questions_to_select <= 0:
                raise ValueError("Must be positive")
        except ValueError:
            print("Invalid number, defaulting to 5 questions")
            questions_to_select = 5
    
    return {
        'name': name,
        'subject': subject,
        'time_limit_minutes': time_limit_minutes,
        'allow_answer_change': allow_answer_change,
        'show_results': show_results,
        'create_bank': create_bank,
        'bank_name': bank_name,
        'questions_to_select': questions_to_select
    }

def clean_text(text: str) -> str:
    """Clean and normalize text content."""
    if not text or text.strip() == '':
        return ''
    
    # Remove extra whitespace and normalize line breaks
    cleaned = ' '.join(text.split())
    return cleaned

def parse_csv_row(row: List[str]) -> Optional[Dict[str, Any]]:
    """Parse a single CSV row into a question object."""
    if len(row) < 8:  # Minimum required columns
        return None
    
    # Extract basic fields
    question_text = clean_text(row[0])
    question_type = clean_text(row[1])
    
    # Skip header row or empty questions
    if not question_text or question_text.startswith('Text of the question'):
        return None
    
    # Extract options (up to 5)
    options = {}
    option_letters = ['A', 'B', 'C', 'D', 'E']
    
    for i in range(5):
        col_index = 2 + i  # Options start at column 2
        if col_index < len(row):
            option_text = clean_text(row[col_index])
            if option_text:
                options[option_letters[i]] = option_text
    
    # Get correct answer
    correct_answer_col = 7
    if correct_answer_col < len(row):
        try:
            correct_answer_num = int(row[correct_answer_col])
            if 1 <= correct_answer_num <= 5:
                correct_answer = option_letters[correct_answer_num - 1]
            else:
                correct_answer = 'A'  # Default fallback
        except (ValueError, IndexError):
            correct_answer = 'A'  # Default fallback
    else:
        correct_answer = 'A'
    
    # Get time limit (optional)
    time_seconds = 30  # Default
    if len(row) > 8 and row[8].strip():
        try:
            time_seconds = int(row[8])
        except ValueError:
            pass
    
    # Get image link (optional)
    image_link = ''
    if len(row) > 9:
        image_link = clean_text(row[9])
    
    # Get explanation (optional)
    explanation = ''
    if len(row) > 10:
        explanation = clean_text(row[10])
    
    # Create question object
    question = {
        'id': int(datetime.now().timestamp() * 1000000),  # Unique ID
        'question': question_text,
        'options': options,
        'correctAnswer': correct_answer,
        'timeLimit': time_seconds,
        'createdAt': datetime.now().isoformat()
    }
    
    # Add optional fields if present
    if image_link:
        question['imageLink'] = image_link
    
    if explanation:
        question['explanation'] = explanation
    
    return question

def convert_csv_to_questions(csv_file_path: str) -> List[Dict[str, Any]]:
    """Convert CSV file to list of question objects."""
    questions = []
    
    try:
        with open(csv_file_path, 'r', encoding='utf-8', newline='') as file:
            # Try to detect if file has BOM
            first_char = file.read(1)
            if first_char != '\ufeff':  # No BOM
                file.seek(0)
            
            csv_reader = csv.reader(file)
            
            row_count = 0
            for row in csv_reader:
                row_count += 1
                question = parse_csv_row(row)
                
                if question:
                    questions.append(question)
                    print(f"Processed question {len(questions)}: {question['question'][:50]}...")
    
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        return []
    
    return questions

def create_finals_format(questions: List[Dict[str, Any]], config: Dict[str, Any]) -> Dict[str, Any]:
    """Create the final JSON structure for Finals Simulator."""
    
    # Create metadata
    metadata = {
        'name': config['name'],
        'subject': config['subject'],
        'allowAnswerChange': config['allow_answer_change'],
        'showResults': config['show_results'],
        'createdAt': datetime.now().isoformat(),
        'version': '1.0'
    }
    
    # Add time limit if specified
    if config['time_limit_minutes']:
        metadata['timeLimit'] = config['time_limit_minutes']
    
    # Prepare questions list
    final_questions = []
    
    if config['create_bank']:
        # Create as question bank
        question_bank = {
            'id': int(datetime.now().timestamp() * 1000000),
            'type': 'questionBank',
            'name': config['bank_name'],
            'questionsToSelect': min(config['questions_to_select'], len(questions)),
            'questions': questions,
            'minimized': False,
            'createdAt': datetime.now().isoformat()
        }
        final_questions.append(question_bank)
    else:
        # Add as individual questions
        final_questions.extend(questions)
    
    return {
        'metadata': metadata,
        'questions': final_questions
    }

def save_json_file(data: Dict[str, Any], output_path: str) -> bool:
    """Save the JSON data to file."""
    try:
        with open(output_path, 'w', encoding='utf-8') as file:
            json.dump(data, file, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving JSON file: {e}")
        return False

def main():
    """Main function to run the converter."""
    print("Finals Simulator CSV Converter")
    print("=" * 50)
    
    # Get CSV file path
    if len(sys.argv) > 1:
        csv_file_path = sys.argv[1]
    else:
        csv_file_path = input("\nEnter path to CSV file: ").strip().strip('"')
    
    # Check if file exists
    if not os.path.exists(csv_file_path):
        print(f"Error: File '{csv_file_path}' not found!")
        return
    
    # Get user configuration
    config = get_user_input()
    
    print(f"\n=== Processing CSV File ===")
    print(f"Input file: {csv_file_path}")
    
    # Convert CSV to questions
    questions = convert_csv_to_questions(csv_file_path)
    
    if not questions:
        print("No valid questions found in CSV file!")
        return
    
    print(f"Successfully processed {len(questions)} questions")
    
    # Create finals format
    finals_data = create_finals_format(questions, config)
    
    # Generate output filename
    base_name = os.path.splitext(os.path.basename(csv_file_path))[0]
    output_path = os.path.join(os.path.dirname(csv_file_path), f"{base_name}_finals.json")
    
    # Save JSON file
    if save_json_file(finals_data, output_path):
        print(f"\n✅ Successfully created: {output_path}")
        
        # Print summary
        print("\n=== Conversion Summary ===")
        print(f"Question Set: {config['name']}")
        print(f"Subject: {config['subject']}")
        print(f"Questions: {len(questions)}")
        
        if config['create_bank']:
            print(f"Created as Bank: {config['bank_name']}")
            print(f"Questions to select: {config['questions_to_select']}")
        else:
            print("Created as individual questions")
        
        print(f"Time limit: {'None' if not config['time_limit_minutes'] else str(config['time_limit_minutes']) + ' minutes'}")
        print(f"Allow answer changes: {'Yes' if config['allow_answer_change'] else 'No'}")
        print(f"Show results: {'Yes' if config['show_results'] else 'No'}")
        
        print(f"\n📁 Output file: {output_path}")
        print("\nYou can now import this file into Finals Simulator!")
        
    else:
        print("❌ Failed to save output file!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user.")
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        import traceback
        traceback.print_exc()
