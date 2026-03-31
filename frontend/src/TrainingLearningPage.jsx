import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CaretDown, MagnifyingGlass } from '@phosphor-icons/react';
import Sidebar from './components/Sidebar';

const platformCards = [
  { id: 'microsoft', label: 'Microsoft Learning', short: 'MS', url: 'https://learn.microsoft.com/training/' },
  { id: 'udemy', label: '', short: 'udemy', url: 'https://www.udemy.com/' },
  { id: 'linkedin', label: 'LinkedIn Learning', short: 'in', url: 'https://www.linkedin.com/learning/' },
  { id: 'ibm', label: 'IBM SkillsBuild', short: 'IBM', url: 'https://skillsbuild.org/' },
];

const platformLinks = {
  'Microsoft Learning': 'https://learn.microsoft.com/training/',
  'Udemy': 'https://www.udemy.com/',
  'LinkedIn Learning': 'https://www.linkedin.com/learning/',
  'IBM SkillsBuild': 'https://skillsbuild.org/',
};

const defaultCourses = [
  { id: 9, platform: 'Microsoft Learning', category: 'LOW-CODE', title: 'Power Platform Fundamentals', description: 'Microsoft Power Apps, Power Automate, and Power BI basics for internal process automation.', instructor: 'David Kim', duration: 2, department: 'IT', role: 'Developer', skill: 'Low-code' },
  { id: 8, platform: 'IBM SkillsBuild', category: 'SECURITY', title: 'Cybersecurity Fundamentals', description: 'Comprehensive cybersecurity course covering network security, threats, and protection strategies.', instructor: 'Lisa Park', duration: 4, department: 'IT', role: 'Security', skill: 'Cybersecurity' },
  { id: 7, platform: 'Udemy', category: 'DATA SCIENCE', title: 'Python for Data Science', description: 'Learn Python programming with focus on analysis, Pandas, NumPy, and visualization techniques.', instructor: 'Alex Turner', duration: 3, department: 'Analytics', role: 'Analyst', skill: 'Python' },
  { id: 6, platform: 'LinkedIn Learning', category: 'MANAGEMENT', title: 'Leadership and Management Essentials', description: 'Develop critical leadership skills, team management, and strategic thinking.', instructor: 'Robert Wilson', duration: 2, department: 'Operations', role: 'Manager', skill: 'Leadership' },
  { id: 5, platform: 'Microsoft Learning', category: 'CLOUD', title: 'Azure Fundamentals AZ-900', description: 'Microsoft Azure basics including cloud concepts, core services, security, and pricing.', instructor: 'Emily Davis', duration: 3, department: 'IT', role: 'Developer', skill: 'Cloud' },
  { id: 4, platform: 'Udemy', category: 'PROGRAMMING', title: 'React.js Fundamentals - Complete Guide', description: 'Master React hooks, components, and state management. Build modern web interfaces.', instructor: 'Mike Ross', duration: 4, department: 'IT', role: 'Developer', skill: 'Frontend' },
  { id: 3, platform: 'IBM SkillsBuild', category: 'CLOUD', title: 'AWS Cloud Practitioner Essentials', description: 'Learn AWS fundamentals including EC2, S3, and RDS. Prepare for the AWS cloud practitioner track.', instructor: 'Sarah Chen', duration: 2, department: 'IT', role: 'Developer', skill: 'Cloud' },
  { id: 2, platform: 'LinkedIn Learning', category: 'COMMUNICATION', title: 'Executive Communication for Teams', description: 'Improve cross-functional communication, presentation confidence, and reporting clarity.', instructor: 'Nora Hall', duration: 2, department: 'HR', role: 'Specialist', skill: 'Communication' },
  { id: 1, platform: 'Udemy', category: 'DATA', title: 'SQL for Business Intelligence', description: 'Practical SQL for reporting and decision-making with real-world case studies and datasets.', instructor: 'Jules Mateo', duration: 3, department: 'Analytics', role: 'Analyst', skill: 'SQL' },
];

const learningPathImage =
  'https://ik.imagekit.io/upgrad1/abroad-images/imageCompo/images/1648621039951_Image_3LK6GFT.webp?pr-true';

function platformLogo(platform) {
  if (platform === 'Microsoft Learning') {
    return (
      <div style={{ width: 130, height: 84, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        <div style={{ background: '#f35325' }} />
        <div style={{ background: '#81bc06' }} />
        <div style={{ background: '#05a6f0' }} />
        <div style={{ background: '#ffba08' }} />
      </div>
    );
  }
  if (platform === 'LinkedIn Learning') {
    return (
      <div style={{ width: 130, height: 84, background: '#0077b5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 62, fontWeight: 800 }}>
        in
      </div>
    );
  }
  if (platform === 'IBM SkillsBuild') {
    return <div style={{ fontSize: 92, color: '#4f7fc8', fontWeight: 800, lineHeight: 1 }}>IBM</div>;
  }
  return <div style={{ fontSize: 72, color: '#111827', fontWeight: 800, lineHeight: 1 }}>udemy</div>;
}

export default function TrainingLearningPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth));
  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('Newest');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [skill, setSkill] = useState('');
  const [isPathOpen, setIsPathOpen] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [courses, setCourses] = useState(() => {
    try {
      const raw = localStorage.getItem('training_courses_v1');
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultCourses;
    } catch {
      return defaultCourses;
    }
  });
  const [courseForm, setCourseForm] = useState({
    link: '',
    platform: 'Microsoft Learning',
    category: '',
    title: '',
    description: '',
    imageUrl: '',
    duration: 2,
    department: '',
    role: '',
    skill: '',
  });

  useEffect(() => {
    localStorage.setItem('training_courses_v1', JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isTablet = viewportWidth <= 1024;
  const isMobile = viewportWidth <= 768;

  const departments = useMemo(() => [...new Set(courses.map((c) => c.department).filter(Boolean))], [courses]);
  const roles = useMemo(() => [...new Set(courses.map((c) => c.role).filter(Boolean))], [courses]);
  const skills = useMemo(() => [...new Set(courses.map((c) => c.skill).filter(Boolean))], [courses]);

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = courses.filter((c) => {
      const matchesQuery = !q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.platform.toLowerCase().includes(q);
      const matchesDepartment = !department || c.department === department;
      const matchesRole = !role || c.role === role;
      const matchesSkill = !skill || c.skill === skill;
      return matchesQuery && matchesDepartment && matchesRole && matchesSkill;
    });

    const sorted = [...matched].sort((a, b) => (sortOrder === 'Newest' ? b.id - a.id : a.id - b.id));
    return sorted;
  }, [courses, query, department, role, skill, sortOrder]);

  const clearFilters = () => {
    setQuery('');
    setSortOrder('Newest');
    setDepartment('');
    setRole('');
    setSkill('');
  };

  const submitAddCourse = (event) => {
    event.preventDefault();

    if (!courseForm.link.trim() || !courseForm.title.trim() || !courseForm.imageUrl.trim()) {
      return;
    }

    const nextCourse = {
      id: Date.now(),
      platform: courseForm.platform,
      category: (courseForm.category || 'GENERAL').toUpperCase(),
      title: courseForm.title.trim(),
      description: courseForm.description.trim() || 'No description provided.',
      duration: Number(courseForm.duration) || 2,
      department: courseForm.department.trim() || 'General',
      role: courseForm.role.trim() || 'General',
      skill: courseForm.skill.trim() || 'General',
      link: courseForm.link.trim(),
      imageUrl: courseForm.imageUrl.trim(),
    };

    setCourses((prev) => [nextCourse, ...prev]);
    setShowAddCourse(false);
    setCourseForm({
      link: '',
      platform: 'Microsoft Learning',
      category: '',
      title: '',
      description: '',
      imageUrl: '',
      duration: 2,
      department: '',
      role: '',
      skill: '',
    });
  };

  return (
    <motion.div
      style={{ display: 'flex', minHeight: '100vh', background: '#ececec' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
    >
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

      <main style={{ flex: 1, overflowX: 'hidden', background: '#ececec', paddingTop: isMobile ? 64 : 0 }}>
        <section style={{ background: '#f4f4f4', padding: isMobile ? '26px 12px 14px' : isTablet ? '24px 26px 18px' : '34px 48px 26px' }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : isTablet ? 36 : 42, fontWeight: 800, color: '#0f172a', lineHeight: isMobile ? 1.1 : 1.02, display: 'block' }}>
            Training & <span style={{ color: '#d4a009' }}>Learning</span>
          </h1>
          <p style={{ marginTop: isMobile ? 8 : 10, fontSize: isMobile ? 12 : 14, color: '#566273', fontStyle: 'italic' }}>
            Discover courses, certifications, and learning paths to grow your skills.
          </p>
        </section>

        <section style={{ background: '#e7dfbf', padding: isMobile ? '14px 12px 16px' : isTablet ? '20px 24px 24px' : '26px 42px 34px' }}>
          <h2 style={{ margin: '0 0 18px 0', fontSize: isMobile ? 18 : 24, color: '#111827' }}>Learning Platforms</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : isTablet ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: isMobile ? 10 : 20 }}>
            {platformCards.map((platform) => (
              <a
                key={platform.id}
                href={platform.url}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none', background: '#f7f7f7', borderRadius: isMobile ? 12 : 18, border: '1px solid #e5e7eb', boxShadow: '0 4px 10px rgba(15, 23, 42, 0.08)', padding: isMobile ? '12px 10px' : '20px 22px', display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 12, cursor: 'pointer', transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease', minWidth: 0, overflow: 'hidden' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(15, 23, 42, 0.12)';
                  e.currentTarget.style.borderColor = '#e6c36f';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(15, 23, 42, 0.08)';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                {platform.short ? (
                  <div style={{ fontWeight: 800, fontSize: isMobile ? 24 : 34, color: platform.id === 'linkedin' ? '#0077b5' : platform.id === 'ibm' ? '#4f7fc8' : '#111827', flexShrink: 0, lineHeight: 1 }}>
                    {platform.short}
                  </div>
                ) : null}
                {platform.label ? (
                  <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, color: '#111827', minWidth: 0, overflowWrap: 'anywhere' }}>
                    {platform.label}
                  </div>
                ) : null}
              </a>
            ))}
          </div>
        </section>

        <section style={{ padding: isMobile ? '12px 10px 10px' : isTablet ? '16px 24px 14px' : '24px 42px 18px', background: '#ececec' }}>
          <div style={{ background: '#f6f6f6', border: '1px solid #d7dbe0', borderRadius: isMobile ? 12 : 18, padding: isMobile ? 10 : 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 100px' : '1fr 220px', gap: isMobile ? 8 : 14 }}>
              <div style={{ position: 'relative' }}>
                <MagnifyingGlass size={isMobile ? 16 : 18} style={{ position: 'absolute', left: 14, top: isMobile ? 12 : 14, color: '#a0a8b5' }} />
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); }}
                  placeholder="Search courses..."
                  style={{ width: '100%', borderRadius: 12, border: '1px solid #d1d5db', height: isMobile ? 40 : 44, paddingLeft: 38, fontSize: isMobile ? 13 : 14, outline: 'none' }}
                />
              </div>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ borderRadius: 12, border: '1px solid #9ca3af', height: isMobile ? 40 : 44, padding: isMobile ? '0 8px' : '0 14px', fontSize: isMobile ? 13 : 14, background: '#fff' }}>
                <option>Newest</option>
                <option>Oldest</option>
              </select>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : isTablet ? '1fr 1fr 1fr' : '220px 220px 220px 1fr', gap: 12 }}>
              <select value={department} onChange={(e) => { setDepartment(e.target.value); }} style={{ borderRadius: 12, border: '1px solid #9ca3af', height: isMobile ? 40 : 44, padding: '0 14px', fontSize: isMobile ? 13 : 14, background: '#fff' }}>
                <option value="">Department</option>
                {departments.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={role} onChange={(e) => { setRole(e.target.value); }} style={{ borderRadius: 12, border: '1px solid #9ca3af', height: isMobile ? 40 : 44, padding: '0 14px', fontSize: isMobile ? 13 : 14, background: '#fff' }}>
                <option value="">Role</option>
                {roles.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={skill} onChange={(e) => { setSkill(e.target.value); }} style={{ borderRadius: 12, border: '1px solid #9ca3af', height: isMobile ? 40 : 44, padding: '0 14px', fontSize: isMobile ? 13 : 14, background: '#fff' }}>
                <option value="">Skill</option>
                {skills.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <div style={{ display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end', gap: 10, gridColumn: isMobile ? '1 / -1' : 'auto' }}>
                <button
                  type="button"
                  onClick={() => setShowAddCourse(true)}
                  style={{ border: '1px solid #d4af0d', cursor: 'pointer', height: isMobile ? 36 : 44, borderRadius: 12, padding: isMobile ? '0 10px' : '0 18px', background: '#fff8df', color: '#7a5b00', fontWeight: 800, fontSize: isMobile ? 12 : 14, transition: 'transform 0.18s ease, box-shadow 0.18s ease', flex: isMobile ? 1 : 'unset' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(212, 175, 13, 0.2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  Add Course
                </button>
                <button type="button" onClick={clearFilters} style={{ border: 'none', cursor: 'pointer', height: isMobile ? 36 : 44, borderRadius: 12, padding: isMobile ? '0 10px' : '0 22px', background: '#d4af0d', color: '#fff', fontWeight: 800, fontSize: isMobile ? 12 : 14, flex: isMobile ? 1 : 'unset' }}>
                  CLEAR
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: isMobile ? 10 : 16, fontSize: isMobile ? 12 : 14, color: '#4b5563', display: 'flex', justifyContent: 'space-between' }}>
            <span>Showing {filteredCourses.length} of {filteredCourses.length} courses</span>
          </div>

          <div className="scrollbar-hide" style={{ marginTop: 12, display: isMobile ? 'grid' : 'flex', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'none', gap: isMobile ? 8 : 14, overflowX: isMobile ? 'visible' : 'auto', paddingBottom: 6 }}>
            {filteredCourses.map((course) => (
              <a
                key={course.id}
                href={course.link || platformLinks[course.platform] || '#'}
                target="_blank"
                rel="noreferrer"
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  flex: isMobile ? 'unset' : '0 0 calc((100% - 42px) / 4)',
                  minWidth: isMobile ? '0' : '250px',
                  border: '1px solid #d6d6d6',
                  borderRadius: isMobile ? 12 : 18,
                  background: '#f5f5f5',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(15, 23, 42, 0.12)';
                  e.currentTarget.style.borderColor = '#e6c36f';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(15, 23, 42, 0.08)';
                  e.currentTarget.style.borderColor = '#d6d6d6';
                }}
              >
                <div style={{ background: '#f0f2f4', height: isMobile ? 92 : 150, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <span style={{ position: 'absolute', right: isMobile ? 8 : 12, top: isMobile ? 8 : 12, background: '#f5f5f5', borderRadius: 999, padding: isMobile ? '4px 8px' : '6px 14px', fontSize: isMobile ? 10 : 14, color: '#475569', fontWeight: 700 }}>
                    {course.duration} Months
                  </span>
                  {course.imageUrl ? (
                    <img
                      src={course.imageUrl}
                      alt={course.title}
                      style={{ maxWidth: '86%', maxHeight: '82%', objectFit: 'contain' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    platformLogo(course.platform)
                  )}
                </div>
                <div style={{ padding: isMobile ? 10 : 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: isMobile ? 10 : 14, marginBottom: isMobile ? 6 : 8, gap: 8 }}>
                    <span style={{ color: '#d4a009', fontWeight: 700 }}>{course.category}</span>
                    <span style={{ color: '#9ca3af', fontWeight: 700 }}>{course.platform}</span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: isMobile ? 11 : 15, fontWeight: 800, color: '#1f2937', lineHeight: 1.28, display: '-webkit-box', WebkitLineClamp: isMobile ? 2 : 'unset', WebkitBoxOrient: isMobile ? 'vertical' : 'unset', overflow: isMobile ? 'hidden' : 'visible' }}>{course.title}</h3>
                  <p style={{ margin: '8px 0 2px 0', color: '#475569', fontSize: isMobile ? 10 : 13, lineHeight: 1.35, display: isMobile ? '-webkit-box' : 'block', WebkitLineClamp: isMobile ? 3 : 'unset', WebkitBoxOrient: isMobile ? 'vertical' : 'unset', overflow: isMobile ? 'hidden' : 'visible' }}>{course.description}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section style={{ padding: isMobile ? '16px 10px 22px' : isTablet ? '22px 24px 28px' : '30px 42px 36px', background: '#ececec' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: isMobile ? 20 : 24, color: '#111827' }}>Learning Path</h2>
          <div style={{ marginBottom: 14 }}>
            <button
              type="button"
              onClick={() => setIsPathOpen((prev) => !prev)}
              style={{ width: '100%', border: '1px solid #d6d6d6', borderRadius: 16, background: '#f5f5f5', padding: isMobile ? '14px 14px' : '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: isMobile ? 14 : 16, color: '#111827', cursor: 'pointer' }}
            >
              <span>Beginner to Advanced</span>
              <CaretDown
                size={isMobile ? 18 : 22}
                style={{ transform: isPathOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }}
              />
            </button>

            <motion.div
              initial={false}
              animate={{
                height: isPathOpen ? 'auto' : 0,
                opacity: isPathOpen ? 1 : 0,
                marginTop: isPathOpen ? 8 : 0,
              }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', padding: '12px 16px' }}>
                <img
                  src={learningPathImage}
                  alt="Beginner to Advanced Learning Path"
                  style={{ width: '100%', borderRadius: 10, display: 'block' }}
                />
              </div>
            </motion.div>
          </div>
        </section>

        <AnimatePresence>
          {showAddCourse && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: isMobile ? 8 : 16 }}
            >
              <motion.form
                onSubmit={submitAddCourse}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.96 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                style={{ width: '100%', maxWidth: 760, background: '#fff', borderRadius: isMobile ? 22 : 16, border: '1px solid #e5e7eb', boxShadow: '0 20px 38px rgba(15, 23, 42, 0.2)', padding: isMobile ? 14 : 18, maxHeight: isMobile ? '94vh' : 'none', overflowY: isMobile ? 'auto' : 'visible' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? 10 : 12 }}>
                  <h3 style={{ margin: 0, fontSize: isMobile ? 18 : 20, color: '#111827' }}>Add Course</h3>
                  <button type="button" onClick={() => setShowAddCourse(false)} style={{ border: 'none', background: '#f3f4f6', width: isMobile ? 30 : 30, height: isMobile ? 30 : 30, borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>x</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                  <input required placeholder="Course Name" value={courseForm.title} onChange={(e) => setCourseForm((p) => ({ ...p, title: e.target.value }))} style={{ height: isMobile ? 50 : 42, borderRadius: isMobile ? 14 : 10, border: '1px solid #d1d5db', padding: isMobile ? '0 16px' : '0 12px', fontSize: isMobile ? 16 : 14 }} />
                  <input required placeholder="Course Link" value={courseForm.link} onChange={(e) => setCourseForm((p) => ({ ...p, link: e.target.value }))} style={{ height: isMobile ? 50 : 42, borderRadius: isMobile ? 14 : 10, border: '1px solid #d1d5db', padding: isMobile ? '0 16px' : '0 12px', fontSize: isMobile ? 16 : 14 }} />
                  <input required placeholder="Image URL" value={courseForm.imageUrl} onChange={(e) => setCourseForm((p) => ({ ...p, imageUrl: e.target.value }))} style={{ height: isMobile ? 50 : 42, borderRadius: isMobile ? 14 : 10, border: '1px solid #d1d5db', padding: isMobile ? '0 16px' : '0 12px', fontSize: isMobile ? 16 : 14 }} />
                  <select value={courseForm.platform} onChange={(e) => setCourseForm((p) => ({ ...p, platform: e.target.value }))} style={{ height: isMobile ? 50 : 42, borderRadius: isMobile ? 14 : 10, border: '1px solid #d1d5db', padding: isMobile ? '0 16px' : '0 12px', fontSize: isMobile ? 16 : 14 }}>
                    {Object.keys(platformLinks).map((name) => <option key={name}>{name}</option>)}
                  </select>
                  <input placeholder="Category (e.g., DATA SCIENCE)" value={courseForm.category} onChange={(e) => setCourseForm((p) => ({ ...p, category: e.target.value }))} style={{ height: isMobile ? 50 : 42, borderRadius: isMobile ? 14 : 10, border: '1px solid #d1d5db', padding: isMobile ? '0 16px' : '0 12px', fontSize: isMobile ? 16 : 14 }} />
                  <input type="number" min="1" max="24" placeholder="Duration (months)" value={courseForm.duration} onChange={(e) => setCourseForm((p) => ({ ...p, duration: e.target.value }))} style={{ height: isMobile ? 50 : 42, borderRadius: isMobile ? 14 : 10, border: '1px solid #d1d5db', padding: isMobile ? '0 16px' : '0 12px', fontSize: isMobile ? 16 : 14 }} />
                  <input placeholder="Department" value={courseForm.department} onChange={(e) => setCourseForm((p) => ({ ...p, department: e.target.value }))} style={{ height: isMobile ? 50 : 42, borderRadius: isMobile ? 14 : 10, border: '1px solid #d1d5db', padding: isMobile ? '0 16px' : '0 12px', fontSize: isMobile ? 16 : 14 }} />
                  <input placeholder="Role" value={courseForm.role} onChange={(e) => setCourseForm((p) => ({ ...p, role: e.target.value }))} style={{ height: isMobile ? 50 : 42, borderRadius: isMobile ? 14 : 10, border: '1px solid #d1d5db', padding: isMobile ? '0 16px' : '0 12px', fontSize: isMobile ? 16 : 14 }} />
                  <input placeholder="Skill" value={courseForm.skill} onChange={(e) => setCourseForm((p) => ({ ...p, skill: e.target.value }))} style={{ height: isMobile ? 50 : 42, borderRadius: isMobile ? 14 : 10, border: '1px solid #d1d5db', padding: isMobile ? '0 16px' : '0 12px', fontSize: isMobile ? 16 : 14 }} />
                </div>

                <textarea placeholder="Description" value={courseForm.description} onChange={(e) => setCourseForm((p) => ({ ...p, description: e.target.value }))} style={{ marginTop: 10, width: '100%', minHeight: isMobile ? 116 : 88, borderRadius: isMobile ? 14 : 10, border: '1px solid #d1d5db', padding: isMobile ? 16 : 12, resize: 'vertical', fontSize: isMobile ? 16 : 14 }} />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12, position: isMobile ? 'sticky' : 'static', bottom: isMobile ? -2 : 'auto', background: isMobile ? '#fff' : 'transparent', paddingTop: isMobile ? 8 : 0 }}>
                  <button type="button" onClick={() => setShowAddCourse(false)} style={{ border: '1px solid #d1d5db', background: '#fff', height: isMobile ? 42 : 40, borderRadius: isMobile ? 12 : 10, padding: isMobile ? '0 18px' : '0 16px', cursor: 'pointer', fontSize: isMobile ? 14 : 14, lineHeight: 1 }}>Cancel</button>
                  <button type="submit" style={{ border: 'none', background: '#d4af0d', color: '#fff', height: isMobile ? 42 : 40, borderRadius: isMobile ? 12 : 10, padding: isMobile ? '0 18px' : '0 16px', fontWeight: 800, cursor: 'pointer', fontSize: isMobile ? 14 : 14, lineHeight: 1 }}>Add</button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </motion.div>
  );
}

