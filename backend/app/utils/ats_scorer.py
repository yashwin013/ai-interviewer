"""
ATS (Applicant Tracking System) Resume Scorer
Rule-based scoring engine - NO AI tokens used
"""

import re
from typing import Dict, List, Any


class ATSScorer:
    """Rule-based ATS resume scoring engine"""
    
    # Common action verbs that ATS systems look for
    ACTION_VERBS = [
        "developed", "managed", "created", "led", "implemented", "designed",
        "achieved", "increased", "reduced", "built", "launched", "improved",
        "optimized", "streamlined", "coordinated", "established", "executed",
        "generated", "delivered", "analyzed", "resolved", "trained", "mentored"
    ]
    
    # Required section headers
    SECTION_HEADERS = [
        "education", "experience", "work experience", "skills", "projects",
        "summary", "objective", "professional experience", "technical skills",
        "certifications", "achievements", "accomplishments"
    ]
    
    # Tech skills keywords (common)
    TECH_KEYWORDS = [
        "python", "javascript", "java", "react", "node", "sql", "aws", "docker",
        "kubernetes", "git", "agile", "scrum", "machine learning", "api",
        "database", "cloud", "devops", "ci/cd", "testing", "mongodb"
    ]
    
    def __init__(self, resume_text: str, resume_profile: Dict[str, Any] = None):
        self.resume_text = resume_text.lower()
        self.resume_text_original = resume_text
        self.resume_profile = resume_profile or {}
        self.breakdown = {}
        self.tips = []
    
    def calculate_score(self) -> Dict[str, Any]:
        """Calculate complete ATS score with breakdown"""
        
        # 1. Contact Information (10 points)
        self._score_contact_info()
        
        # 2. Section Headers (15 points)
        self._score_sections()
        
        # 3. Skills & Keywords (25 points)
        self._score_skills()
        
        # 4. Action Verbs (15 points)
        self._score_action_verbs()
        
        # 5. Quantified Results (15 points)
        self._score_quantified_results()
        
        # 6. Length & Format (10 points)
        self._score_length()
        
        # 7. Professional Experience (10 points)
        self._score_experience()
        
        # Calculate totals
        total_score = sum(item["score"] for item in self.breakdown.values())
        max_score = sum(item["max"] for item in self.breakdown.values())
        percentage = round((total_score / max_score) * 100) if max_score > 0 else 0
        
        return {
            "total_score": total_score,
            "max_score": max_score,
            "percentage": percentage,
            "rating": self._get_rating(percentage),
            "breakdown": self.breakdown,
            "tips": self.tips[:5],  # Top 5 tips
            "summary": self._generate_summary(percentage)
        }
    
    def _score_contact_info(self):
        """Score contact information presence (10 points)"""
        score = 0
        details = []
        
        # Email check (4 points)
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        if re.search(email_pattern, self.resume_text_original):
            score += 4
            details.append("✓ Email found")
        else:
            self.tips.append("Add your email address to the resume")
            details.append("✗ Email missing")
        
        # Phone check (3 points)
        phone_pattern = r'[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{4,6}'
        if re.search(phone_pattern, self.resume_text_original):
            score += 3
            details.append("✓ Phone found")
        else:
            self.tips.append("Add your phone number to the resume")
            details.append("✗ Phone missing")
        
        # LinkedIn check (3 points)
        if "linkedin" in self.resume_text:
            score += 3
            details.append("✓ LinkedIn found")
        else:
            self.tips.append("Add your LinkedIn profile URL")
            details.append("✗ LinkedIn missing")
        
        self.breakdown["contact_info"] = {
            "score": score,
            "max": 10,
            "label": "Contact Information",
            "details": details
        }
    
    def _score_sections(self):
        """Score section headers presence (15 points)"""
        score = 0
        found_sections = []
        missing_essential = []
        
        essential = ["experience", "education", "skills"]
        optional = ["projects", "summary", "certifications"]
        
        for section in essential:
            if section in self.resume_text or section.replace(" ", "") in self.resume_text:
                score += 4
                found_sections.append(f"✓ {section.title()}")
            else:
                missing_essential.append(section.title())
        
        for section in optional:
            if section in self.resume_text:
                score += 1
                found_sections.append(f"✓ {section.title()}")
        
        score = min(score, 15)
        
        if missing_essential:
            self.tips.append(f"Add missing sections: {', '.join(missing_essential)}")
        
        self.breakdown["sections"] = {
            "score": score,
            "max": 15,
            "label": "Section Headers",
            "details": found_sections
        }
    
    def _score_skills(self):
        """Score skills and keywords (25 points)"""
        skills = self.resume_profile.get("skills", [])
        skill_count = len(skills)
        
        # Also count tech keywords in text
        tech_found = sum(1 for kw in self.TECH_KEYWORDS if kw in self.resume_text)
        
        # Score: 2 points per skill, max 25
        score = min((skill_count * 2) + (tech_found), 25)
        
        details = [f"✓ {skill_count} skills identified"]
        if skill_count < 8:
            self.tips.append("Add more relevant skills (aim for 8-15 skills)")
        
        if tech_found > 0:
            details.append(f"✓ {tech_found} tech keywords found")
        
        self.breakdown["skills"] = {
            "score": score,
            "max": 25,
            "label": "Skills & Keywords",
            "details": details
        }
    
    def _score_action_verbs(self):
        """Score action verbs usage (15 points)"""
        verbs_found = []
        
        for verb in self.ACTION_VERBS:
            if verb in self.resume_text:
                verbs_found.append(verb)
        
        # Score: 2 points per verb, max 15
        score = min(len(verbs_found) * 2, 15)
        
        details = [f"✓ Found: {', '.join(verbs_found[:5])}..." if verbs_found else "✗ No action verbs found"]
        
        if len(verbs_found) < 5:
            self.tips.append("Use more action verbs like 'developed', 'managed', 'implemented'")
        
        self.breakdown["action_verbs"] = {
            "score": score,
            "max": 15,
            "label": "Action Verbs",
            "details": details
        }
    
    def _score_quantified_results(self):
        """Score quantified achievements (15 points)"""
        patterns = [
            r'\d+%',           # Percentages: 20%, 150%
            r'\$[\d,]+',       # Dollar amounts: $50,000
            r'\d+\+?\s*(years?|months?)',  # Time: 5 years
            r'\d+\+?\s*(projects?|clients?|users?|customers?)',  # Counts
            r'increased.*\d+', # Increased by X
            r'reduced.*\d+',   # Reduced by X
            r'saved.*\d+',     # Saved X
        ]
        
        matches = []
        for pattern in patterns:
            found = re.findall(pattern, self.resume_text, re.IGNORECASE)
            matches.extend(found)
        
        # Score: 3 points per quantified result, max 15
        score = min(len(matches) * 3, 15)
        
        details = [f"✓ {len(matches)} quantified achievements found"] if matches else ["✗ No quantified results"]
        
        if len(matches) < 3:
            self.tips.append("Add quantified achievements (e.g., 'Increased sales by 25%')")
        
        self.breakdown["quantified"] = {
            "score": score,
            "max": 15,
            "label": "Quantified Results",
            "details": details
        }
    
    def _score_length(self):
        """Score resume length and format (10 points)"""
        word_count = len(self.resume_text.split())
        
        # Ideal length: 400-800 words for 1 page
        if 400 <= word_count <= 800:
            score = 10
            status = "✓ Optimal length"
        elif 300 <= word_count < 400 or 800 < word_count <= 1000:
            score = 7
            status = "⚠ Slightly off ideal length"
        elif 200 <= word_count < 300:
            score = 5
            status = "⚠ Resume is too short"
            self.tips.append("Add more content - resume seems too short")
        elif word_count > 1000:
            score = 5
            status = "⚠ Resume is too long"
            self.tips.append("Consider shortening - keep to 1-2 pages")
        else:
            score = 3
            status = "✗ Resume length issues"
            self.tips.append("Resume needs more content")
        
        self.breakdown["length"] = {
            "score": score,
            "max": 10,
            "label": "Length & Format",
            "details": [status, f"Word count: {word_count}"]
        }
    
    def _score_experience(self):
        """Score experience section (10 points)"""
        score = 0
        details = []
        
        # Check for seniority level
        seniority = self.resume_profile.get("seniority_level", "").lower()
        if seniority:
            score += 3
            details.append(f"✓ Level: {seniority.title()}")
        
        # Check for experience description
        experience = self.resume_profile.get("experience", "")
        if experience and len(experience) > 50:
            score += 4
            details.append("✓ Experience described")
        
        # Check for company/role patterns
        role_patterns = ["engineer", "developer", "manager", "analyst", "designer", "lead"]
        roles_found = sum(1 for r in role_patterns if r in self.resume_text)
        if roles_found > 0:
            score += 3
            details.append(f"✓ {roles_found} role keywords found")
        
        score = min(score, 10)
        
        self.breakdown["experience"] = {
            "score": score,
            "max": 10,
            "label": "Professional Experience",
            "details": details if details else ["⚠ Add more experience details"]
        }
    
    def _get_rating(self, percentage: int) -> str:
        """Get rating based on percentage"""
        if percentage >= 85:
            return "Excellent"
        elif percentage >= 70:
            return "Good"
        elif percentage >= 50:
            return "Needs Improvement"
        else:
            return "Poor"
    
    def _generate_summary(self, percentage: int) -> str:
        """Generate a summary message"""
        if percentage >= 85:
            return "Your resume is well-optimized for ATS systems!"
        elif percentage >= 70:
            return "Your resume is good but has room for improvement."
        elif percentage >= 50:
            return "Your resume needs some work to pass ATS filters."
        else:
            return "Your resume may struggle with ATS systems. Follow the tips below."


def calculate_ats_score(resume_text: str, resume_profile: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Calculate ATS score for a resume.
    
    Args:
        resume_text: Full text content of the resume
        resume_profile: Optional dict with parsed profile data (skills, experience, etc.)
    
    Returns:
        Dict with score, breakdown, tips, and rating
    """
    scorer = ATSScorer(resume_text, resume_profile)
    return scorer.calculate_score()
