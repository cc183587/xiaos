import re

# 读取 HTML 文件
with open('index -backup.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# 找到并替换 loadData 函数
# 注意：我们之前已经修改过一次 loadData，现在需要找到修改后的版本并完全替换

# 查找 "loadData = async function(company) {"
pattern = r"loadData = async function\(company\) \{"

matches = list(re.finditer(pattern, html_content))
if not matches:
    print("错误：未找到 loadData 函数")
    exit(1)

match = matches[0]
start_pos = match.start()

# 找到函数的结束位置
brace_count = 0
in_func = False
end_pos = -1

for i in range(start_pos, len(html_content)):
    char = html_content[i]
    if char == '{':
        if not in_func:
            in_func = True
        brace_count += 1
    elif char == '}':
        brace_count -= 1
        if brace_count == 0 and in_func:
            end_pos = i + 1
            break

if end_pos == -1:
    print("错误：未找到 loadData 函数的结束位置")
    exit(1)

# 新的 loadData 函数 - 直接返回本地数据，不调用 API
new_load_data = """loadData = async function(company) {
  currentCompany = company;
  data = {
    employees: excelImportedEmployees || {},
    records: excelImportedRecords || {},
    products: {},
    batches: {},
    currentCompany: company,
    currentUser: currentUser,
    isAdmin: isAdmin
  };
  console.log('数据已从 Excel 导入:', {
    员工数: Object.keys(excelImportedEmployees || {}).length,
    记录数: Object.keys(excelImportedRecords || {}).length
  });
  return data;
};"""

# 替换整个函数
html_content = html_content[:start_pos] + new_load_data + html_content[end_pos:]

# 保存文件
with open('index -backup.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("成功！loadData 函数已完全替换为本地版本")
print("现在不会再调用 API 了")
