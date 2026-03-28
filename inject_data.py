import json

# 读取转换后的数据
with open('imported_records.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 读取备份的 HTML 文件
with open('index -backup.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# 构建 JavaScript 数据插入语句
data_js = f"""
// 从 Excel 导入的数据
const excelImportedData = {json.dumps(data, ensure_ascii=False, indent=4)};
"""

# 查找 data 变量定义并替换
# 查找类似 "const data = {" 的位置
import re

# 查找 data 对象的结束位置
# 首先查找 data 变量的定义
pattern = r"const data = \{"

# 找到 data 的定义位置
matches = list(re.finditer(pattern, html_content))

if matches:
    # 找到第一个匹配的位置
    first_match = matches[0]
    start_pos = first_match.end() - 1  # 找到 { 的位置

    # 找到对应的闭合 }
    brace_count = 0
    end_pos = start_pos
    for i in range(start_pos, len(html_content)):
        char = html_content[i]
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                end_pos = i + 1
                break

    if end_pos > start_pos:
        # 构建新的 data 对象，包含 employees 和 records
        new_data_js = f"""const data = {{
  employees: excelImportedData.employees,
  records: excelImportedData.records,
  products: {{}},
  batches: {{}},
  currentCompany: 'factory',
  currentUser: null,
  isAdmin: false
}};"""

        # 替换原 data 定义
        html_content = html_content[:first_match.start()] + new_data_js + html_content[end_pos:]

        # 保存修改后的文件
        with open('index -backup.html', 'w', encoding='utf-8') as f:
            f.write(html_content)

        print("成功！数据已导入到 index -backup.html")
        print(f"员工数: {len(data['employees'])}")
        print(f"记录数: {len(data['records'])}")
    else:
        print("错误：未找到 data 对象的结束位置")
else:
    print("错误：未找到 data 变量定义")
