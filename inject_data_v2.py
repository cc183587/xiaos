import json
import re

# 读取转换后的数据
with open('imported_records.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 读取备份的 HTML 文件
with open('index -backup.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# 构建注入的 JavaScript 代码
inject_js = f"""
// ==================== Excel 导入的数据 ====================
const excelImportedEmployees = {json.dumps(data['employees'], ensure_ascii=False)};
const excelImportedRecords = {json.dumps(data['records'], ensure_ascii=False)};

// 覆盖 loadData 函数，使用导入的数据
const originalLoadData = loadData;
loadData = async function(company) {{
  currentCompany = company;
  data = {{
    employees: excelImportedEmployees,
    records: excelImportedRecords,
    products: {{}},
    batches: {{}},
    currentCompany: company,
    currentUser: currentUser,
    isAdmin: isAdmin
  }};
  console.log('数据已从 Excel 导入:', {{
    员工数: Object.keys(excelImportedEmployees).length,
    记录数: Object.keys(excelImportedRecords).length
  }});
  return data;
}};
// ==================== Excel 导入数据结束 ====================

"""

# 在第一个 <script> 标签后面注入数据
pattern = r"<script>\s*// ==================== 自定义模态框"
replacement = inject_js + "\n\n// ==================== 自定义模态框"

html_content = re.sub(pattern, replacement, html_content, count=1)

# 保存修改后的文件
with open('index -backup.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("成功！数据已注入到 index -backup.html")
print(f"员工数: {len(data['employees'])}")
print(f"记录数: {len(data['records'])}")
print("\n现在可以在浏览器中打开 index -backup.html 查看导入的数据")
