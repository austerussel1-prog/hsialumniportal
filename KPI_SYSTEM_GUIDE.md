# KPI Tracking System - Implementation Guide

## Overview
A comprehensive KPI (Key Performance Indicator) tracking system has been implemented to track individual performance metrics for employees and alumni. The system monitors various activities and generates engagement scores and performance ratings.

## Features

### 1. **Individual KPI Tracking**
- Tracks 15+ performance metrics per user
- Automatic engagement score calculation (0-100)
- Performance rating system (0-5 stars)
- Real-time metric updates

### 2. **Tracked Metrics**
- **Events**: Attendance, creation
- **Jobs**: Postings, applications, placements
- **Volunteer Work**: Hours, participations, opportunities created
- **Mentorship**: Sessions conducted and attended
- **Achievements**: Badges earned, certifications completed
- **Communication**: Messages sent/received
- **Documents**: Shared, downloaded
- **Activity**: Login count, last login date

### 3. **KPI Dashboard**
- Filter by user type (alumni/employee)
- Sort by various metrics
- Leaderboard display with top performers
- Aggregate statistics and insights
- Individual performance tables

### 4. **Admin Features**
- View all KPIs across the system
- Update performance ratings and remarks
- Refresh KPI data on-demand
- Export KPI reports
- Track engagement trends

## Backend Implementation

### Database Models

**KPI.js** - Mongoose schema with fields:
```javascript
- userId: Reference to User
- userType: 'employee' or 'alumni'
- engagementScore: 0-100
- performanceRating: 0-5
- 15+ activity metrics
- timestamps
```

### API Endpoints

**Base URL**: `/api/kpi`

#### Public Endpoints (No Auth Required)
- `GET /kpi/leaderboard/:userType` - Get top performers
- `GET /kpi/stats/summary` - Get aggregate statistics

#### Admin Endpoints
- `GET /kpi` - List all KPIs (paginated, sortable)
- `GET /kpi/user/:userId` - Get specific user KPI
- `POST /kpi/user/:userId/refresh` - Recalculate KPI metrics
- `PATCH /kpi/user/:userId` - Update KPI fields

### Services

**kpiService.js** provides utility functions:
- `initializeUserKPI(userId, userRole)` - Create KPI record
- `refreshUserKPI(userId)` - Recalculate metrics
- `refreshAllKPIs()` - Batch refresh all users
- `updateKPIMetric(userId, metricName, value)` - Update single metric
- `calculateEngagementScore(kpi)` - Score calculation

### Automatic KPI Initialization

KPI records are automatically created when:
1. **User Approval**: When an admin approves a user registration
2. **Manual Migration**: Run the migration script

## Frontend Implementation

### Components

**KPIDashboard.jsx** - Main dashboard featuring:
- Summary statistics cards
- Leaderboard table
- Complete KPI performance table
- Filter and sort controls
- Real-time data fetching

### Navigation
- Added to Sidebar with restricted admin access
- Route: `/kpi-dashboard`
- Protected by AdminOnlyRoute

## Setup & Installation

### 1. Backend Setup

#### Register KPI Routes
The KPI routes are already registered in `server.js`:
```javascript
app.use('/api/kpi', kpiRoutes);
```

#### Initialize Database Schema
Run Node.js with model import:
```bash
node -e "require('./models/KPI')"
```

#### Migrate Existing Users (Optional)
Initialize KPIs for all existing approved users:
```bash
node scripts/migrateKPI.js
```

This script will:
- Connect to MongoDB
- Find all approved users
- Create KPI records
- Calculate engagement scores
- Display migration summary

### 2. Frontend Setup

#### API Configuration
KPI endpoints already configured in `config/api.js`:
```javascript
kpi: '/api/kpi'
kpiUser: (userId) => `/api/kpi/user/${userId}`
kpiLeaderboard: (userType) => `/api/kpi/leaderboard/${userType}`
kpiStats: `/api/kpi/stats/summary`
```

#### Sidebar Integration
KPI Dashboard automatically added to sidebar navigation for admins.

## Usage

### For Administrators

1. **Access KPI Dashboard**
   - Click "KPI Dashboard" in sidebar
   - Required: Admin role

2. **View Performance Data**
   - Filter by alumni or employees
   - Sort by engagement score, performance rating, or other metrics
   - View top performers in leaderboard

3. **Update Ratings**
   - Access via API: `PATCH /api/kpi/user/:userId`
   - Payload: `{ performanceRating: 4.5, performanceRemarks: "Excellent engagement" }`

4. **Refresh Metrics**
   - Manual refresh: `POST /api/kpi/user/:userId/refresh`
   - Recalculates all metrics from raw data

### For Users
- View own engagement metrics on individual dashboard (future feature)
- See leaderboard rankings
- Track achievement progress

## Engagement Score Calculation

Engagement score (0-100) weighted formula:

| Metric | Weight |
|--------|--------|
| Job Placements | 20 |
| Mentorship Conducted | 15 |
| Jobs Posted | 15 |
| Mentorship Attended | 10 |
| Volunteer Hours | 10 |
| Events Created | 10 |
| Certifications | 12 |
| Badge Earned | 8 |
| Volunteer Participations | 8 |
| Job Applications | 8 |
| Events Attended | 5 |
| Documents Shared | 5 |
| Trainings Completed | 10 |
| Messages Sent | 2 |
| Login Count | 1 |

## API Examples

### Get All KPIs (Admin)
```bash
GET /api/kpi?page=1&limit=20&userType=alumni&sortBy=engagementScore&order=desc
Authorization: Bearer <admin-token>
```

### Get User KPI
```bash
GET /api/kpi/user/:userId
Authorization: Bearer <token>
```

### Refresh User KPI
```bash
POST /api/kpi/user/:userId/refresh
Authorization: Bearer <admin-token>
```

### Get Leaderboard
```bash
GET /api/kpi/leaderboard/alumni?limit=10&metric=engagementScore
```

### Get Statistics
```bash
GET /api/kpi/stats/summary?userType=alumni
```

## Performance Considerations

- KPI calculations are performed on-demand or during batch operations
- Consider scheduling periodic refresh jobs for large datasets
- Leaderboard queries use indexed fields for performance
- Pagination implemented for large datasets

## Future Enhancements

1. **Scheduled Refresh**: Implement cron job for automatic KPI refresh
2. **Historical Tracking**: Store KPI snapshots for trend analysis
3. **Custom Weights**: Admin-configurable scoring weights
4. **Notifications**: Alert users of ranking changes
5. **Export Reports**: CSV/PDF export functionality
6. **Performance Alerts**: System alerts for engagement drops
7. **Goal Setting**: Individual KPI targets and tracking
8. **Departmental KPIs**: Group-level performance metrics

## Troubleshooting

### KPI Data Not Updating
1. Check user has `status: 'approved'`
2. Run manual refresh: `POST /api/kpi/user/:userId/refresh`
3. Check MongoDB connection

### Migration Issues
1. Ensure MongoDB URI is correct
2. Check user collection exists
3. Review logs in terminal output

### Dashboard Not Loading
1. Verify admin role
2. Check browser console for API errors
3. Ensure token is valid
4. Verify CORS configuration

## Support
For issues or questions, refer to the API documentation or check backend logs.
