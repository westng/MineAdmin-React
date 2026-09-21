SELECT id, name, component
FROM menu
WHERE component IN (
  'base/views/login/index',
  'base/views/dashboard/index',
  'base/views/clinic/index',
  'base/views/dynamic-menu/index',
  'base/views/user-center/index',
  'base/views/account-settings/index',
  'base/views/settings/index',
  'base/views/permission/department/index',
  'base/views/permission/menu/index',
  'base/views/permission/role/index',
  'base/views/permission/user/index'
);

UPDATE menu
SET component = CASE component
  WHEN 'base/views/login/index' THEN 'base/auth/views/index'
  WHEN 'base/views/dashboard/index' THEN 'base/dashboard/views/index'
  WHEN 'base/views/clinic/index' THEN 'base/clinic/views/index'
  WHEN 'base/views/dynamic-menu/index' THEN 'base/dynamic-menu/views/index'
  WHEN 'base/views/user-center/index' THEN 'base/user-center/views/index'
  WHEN 'base/views/account-settings/index' THEN 'base/account-settings/views/index'
  WHEN 'base/views/settings/index' THEN 'base/settings/views/index'
  WHEN 'base/views/permission/department/index' THEN 'base/permission/department/views/index'
  WHEN 'base/views/permission/menu/index' THEN 'base/permission/menu/views/index'
  WHEN 'base/views/permission/role/index' THEN 'base/permission/role/views/index'
  WHEN 'base/views/permission/user/index' THEN 'base/permission/user/views/index'
END
WHERE component IN (
  'base/views/login/index',
  'base/views/dashboard/index',
  'base/views/clinic/index',
  'base/views/dynamic-menu/index',
  'base/views/user-center/index',
  'base/views/account-settings/index',
  'base/views/settings/index',
  'base/views/permission/department/index',
  'base/views/permission/menu/index',
  'base/views/permission/role/index',
  'base/views/permission/user/index'
);

SELECT id, name, component
FROM menu
WHERE component LIKE 'base/views/%';
