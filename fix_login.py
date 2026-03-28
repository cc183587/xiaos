import re

# 读取 HTML 文件
with open('index -backup.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# 找到登录函数并修改
# 查找 async function login(){ 的位置
login_func_pattern = r"async function login\(\)\{[^\}]*const val = document\.getElementById\('loginInput'\)\.value\.trim\(\);"

# 替换为支持本地登录的版本
new_login_func = """async function login(){
  const val = document.getElementById('loginInput').value.trim();
  if(!val){ showToast('请输入工号', 'error'); return; }

  // 检查是否是本地 Excel 导入的数据
  if(excelImportedEmployees && excelImportedEmployees[val]){
    // 本地员工登录
    const emp = excelImportedEmployees[val];
    currentUser = val;
    currentCompany = 'factory';
    isAdmin = false;

    // 加载数据
    await loadData(currentCompany);

    // 显示员工页面
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('empPage').style.display = 'block';
    document.querySelectorAll('.logout-float').forEach(el => el.style.display = '');
    document.getElementById('empTitle').textContent = '员工产量登记';
    rebuildProdSelect();
    document.getElementById('empResult').innerHTML = '';
    const greeting = getGreeting();
    document.getElementById('empWelcome').textContent = `${greeting} ${emp.name} 同学`;
    showToast(`登录成功`, 'success');
    document.querySelector('.logout-btn').style.display = 'block';

    // 保存登录状态
    saveLoginSession(val, 'factory', 'employee');
    return;
  }

  // 检查是否是管理员（管理员密码是 XS）
  if(val === 'admin' || val === 'XS'){
    // 管理员登录
    currentCompany = 'factory';
    isAdmin = true;

    // 加载数据
    await loadData(currentCompany);

    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('adminPage').style.display = 'block';
    document.getElementById('adminBar').style.display = 'block';
    document.querySelectorAll('.logout-float').forEach(el => el.style.display = '');
    document.getElementById('adminTitle').textContent = '工厂系统 管理员面板';
    showAdmin('summary');
    setTimeout(adjustAdminPadding, 50);
    showToast(`登录成功！祝老板发大财！`, 'success');
    document.querySelector('.logout-btn').style.display = 'block';

    // 保存登录状态
    saveLoginSession('admin', 'factory', 'admin');
    return;
  }

  // 不在本地数据中
  showToast(`未找到工号: ${val}`, 'error');
}"""

# 找到登录函数的起始位置
login_start = html_content.find('async function login(){')
if login_start == -1:
    print("错误：未找到登录函数")
    exit(1)

# 找到函数的结束位置（通过平衡大括号）
brace_count = 0
func_start = login_start
in_func = False
func_end = -1

for i in range(func_start, len(html_content)):
    char = html_content[i]
    if char == '{':
        if not in_func:
            in_func = True
        brace_count += 1
    elif char == '}':
        brace_count -= 1
        if brace_count == 0 and in_func:
            func_end = i + 1
            break

if func_end == -1:
    print("错误：未找到登录函数的结束位置")
    exit(1)

# 替换整个函数
html_content = html_content[:func_start] + new_login_func + html_content[func_end:]

# 保存修改后的文件
with open('index -backup.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("成功！登录功能已修复")
print("现在可以使用的登录方式：")
print("  - 员工登录：输入工号（如：ALQP、AXX、AYSY、ALXQ）")
print("  - 管理员登录：输入 admin 或 XS")
