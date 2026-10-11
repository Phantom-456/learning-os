import unittest
from unittest.mock import patch
from udemy_mcp.client import UdemyClient
from udemy_mcp.models import CourseCurriculum, ChapterSection, LectureItem


class TestUdemyClientParsing(unittest.TestCase):
    def setUp(self):
        self.client = UdemyClient()

    @patch("udemy_mcp.client.UdemyClient._request")
    def test_search_courses_parsing(self, mock_request):
        mock_request.return_value = {
            "results": [
                {
                    "_class": "course",
                    "id": 12345,
                    "title": "ROS 2 for Beginners",
                    "headline": "Learn ROS 2 step by step",
                    "url": "/course/ros2-for-beginners/",
                    "instructor_name": ["Edouard Renard"],
                    "rating": 4.8,
                    "num_subscribers": 15000,
                    "content_info": "12.5 total hours"
                }
            ]
        }

        courses = self.client.search_courses("ROS 2", page_size=1)
        self.assertEqual(len(courses), 1)
        c = courses[0]
        self.assertEqual(c.id, 12345)
        self.assertEqual(c.title, "ROS 2 for Beginners")
        self.assertEqual(c.primary_instructor, "Edouard Renard")
        self.assertEqual(c.url, "https://www.udemy.com/course/ros2-for-beginners/")

    @patch("udemy_mcp.client.UdemyClient._request")
    def test_curriculum_structure_parsing(self, mock_request):
        mock_request.return_value = {
            "results": [
                {"_class": "chapter", "id": 101, "title": "Getting Started", "object_index": 1},
                {"_class": "lecture", "id": 201, "title": "Welcome to ROS 2", "object_index": 1, "content_summary": "05:00", "description": "<p>Overview of ROS 2</p>"},
                {"_class": "lecture", "id": 202, "title": "Differential Drive Kinematics", "object_index": 2, "content_summary": "12:30", "description": "Kinematics equations"}
            ],
            "next": None
        }

        curriculum = self.client.get_course_curriculum(course_id=12345)
        self.assertEqual(curriculum.course_id, 12345)
        self.assertEqual(curriculum.total_lectures, 2)
        self.assertEqual(len(curriculum.sections), 1)
        section = curriculum.sections[0]
        self.assertEqual(section.title, "Getting Started")
        self.assertEqual(len(section.lectures), 2)
        self.assertEqual(section.lectures[1].title, "Differential Drive Kinematics")
        self.assertEqual(section.lectures[0].description, "Overview of ROS 2")


if __name__ == "__main__":
    unittest.main()
