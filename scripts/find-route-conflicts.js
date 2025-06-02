const fs = require('fs');
const path = require('path');

function findDynamicRoutes(dir, routes = {}) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (file.startsWith('[') && file.endsWith(']')) {
        // This is a dynamic route
        const paramName = file.slice(1, -1); // Remove [ and ]
        const pathPattern = dir.replace(/\\/g, '/').replace(/^.*app\//, '/').replace(/\/\[.*\]/, '');
        
        if (!routes[pathPattern]) {
          routes[pathPattern] = [];
        }
        routes[pathPattern].push(paramName);
      }
      
      findDynamicRoutes(fullPath, routes);
    }
  });
  
  return routes;
}

// Start scanning from the app directory
const routes = findDynamicRoutes(path.join(__dirname, '..', 'app'));

// Check for conflicts
let hasConflicts = false;

Object.entries(routes).forEach(([pathPattern, params]) => {
  if (params.length > 1) {
    console.log(`Conflict in path ${pathPattern}:`);
    console.log(`  Parameters: ${params.join(', ')}`);
    hasConflicts = true;
  }
});

if (!hasConflicts) {
  console.log('No route conflicts found.');
} else {
  console.log('\nTo fix conflicts, make sure you use the same parameter name for the same path pattern.');
}
