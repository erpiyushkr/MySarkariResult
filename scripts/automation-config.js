// Shared automation configuration for section generators and sitemaps
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.BASE_URL || 'https://mysarkariresult.in';

// Sections mapping. Keep `dir` matching the repository folder name (case-sensitive)
// and `json` matching the assets/data file name (existing files are pluralized).
const SECTIONS = [
    { dir: 'Jobs', json: 'jobs.json', baseUrlSegment: 'Jobs' },
    { dir: 'Admit-Card', json: 'admit-cards.json', baseUrlSegment: 'Admit-Card' },
    { dir: 'Results', json: 'results.json', baseUrlSegment: 'Results' },
    { dir: 'Admission', json: 'admissions.json', baseUrlSegment: 'Admission' },
    { dir: 'Answer-Key', json: 'answer-keys.json', baseUrlSegment: 'Answer-Key' },
    { dir: 'Syllabus', json: 'syllabus.json', baseUrlSegment: 'Syllabus' },
    { dir: 'Important', json: 'important.json', baseUrlSegment: 'Important' }
];

module.exports = {
    REPO_ROOT,
    BASE_URL,
    SECTIONS
};
