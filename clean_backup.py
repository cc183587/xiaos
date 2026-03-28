import pandas as pd
import json
import re

# 读取 Excel 文件
excel_file = '(生产登记表)表格视图.xlsx'
df = pd.read_excel(excel_file, sheet_name='表格视图')
df = df.fillna('')

# 构建记录数据结构
records = {}
for _, row in df.iterrows():
    emp_id = str(row['工号']).strip()
    emp_name = str(row['姓名']).strip()
    date = str(row['日期']).split(' ')[0]  # 只取日期部分
    prod_name = str(row['产品名称']).strip()

    if emp_id not in records:
        records[emp_id] = {}
    if date not in records[emp_id]:
        records[emp_id][date] = {}
    if prod_name not in records[emp_id][date]:
        records[emp_id][date][prod_name] = []

    process_columns = [
        '项目-音箱(X3)', '音箱(X3):贴喇叭', '音箱(X3):贴电池', '音箱(X3):贴按键',
        '-音箱(X3):点板', '音箱(X3):装按键', '音箱(X3):组装', '音箱(X3):锁螺丝',
        '音箱(X3):贴硅胶', '蓝牙耳机带灯', '蓝牙耳机带灯:滴喇叭', '蓝牙耳机带灯:套棉对',
        '蓝牙耳机带灯:点板', '蓝牙耳机带灯:锁电板', '蓝牙耳机带灯:贴金片',
        '生产明细:项目-粉色耳机', '粉色耳机:穿线', '粉色耳机:贴棉+过线',
        '打锁扣+反螺丝', '粉色耳机:内外匙', '粉色耳机:打叉螺丝', '粉色耳机:打叉'
    ]

    for col in process_columns:
        if col in df.columns:
            value = row[col]
            if value and str(value).strip() and str(value) != 'nan':
                process_name = col
                if ':' in col:
                    process_name = col.split(':')[-1]
                elif '-' in col:
                    continue

                try:
                    qty = float(value)
                except:
                    import re as regex
                    numbers = regex.findall(r'\d+\.?\d*', str(value))
                    if numbers:
                        qty = float(numbers[0])
                    else:
                        continue

                records[emp_id][date][prod_name].append({
                    'name': process_name,
                    'n': qty,
                    'p': 0.5,
                    'time': '',
                    'batchCode': '',
                    'id': len(records[emp_id][date][prod_name]) + 1
                })

# 构建 employees 数据
employees = {}
for emp_id in records.keys():
    emp_data = df[df['工号'] == emp_id]
    if not emp_data.empty:
        emp_name = emp_data.iloc[0]['姓名']
        employees[emp_id] = {'id': emp_id, 'name': emp_name}

print(f"数据准备完成：员工数 {len(employees)}, 记录数 {len(records)}")

# 读取原始 HTML
with open('index -backup.html', 'r', encoding='utf-8') as f:
    original_html = f.read()

# 提取 CSS 和 HTML 结构
# 找到 </head> 前的所有内容
head_end = original_html.find('</head>')
html_start = original_html.find('<body>')
body_content = original_html[html_start:]

# 创建新的简化 HTML 文件
new_html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>每日产量登记系统</title>
<style>
  *{{margin:0;padding:0;box-sizing:border-box;font-family:Microsoft YaHei,sans-serif}}
  body{{background:#f0f2f5;padding:20px;min-height:100vh}}
  h1{{font-size:28px;text-align:center;margin:20px 0;color:#ff3b30;font-weight:bold}}
  .container{{max-width:1000px;margin:0 auto;background:#fff;padding:20px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1)}}
  .filter-box{{display:flex;gap:15px;margin-bottom:20px;align-items:center}}
  .filter-box select,.filter-box input{{padding:10px;border:1px solid #ccc;border-radius:4px;font-size:14px}}
  .filter-box button{{padding:10px 20px;background:#007AFF;color:#fff;border:none;border-radius:4px;cursor:pointer}}
  .filter-box button:hover{{background:#0051D5}}
  table{{width:100%;border-collapse:collapse;margin-top:20px}}
  th,td{{border:1px solid #ddd;padding:10px;text-align:left;font-size:13px}}
  th{{background:#007AFF;color:#fff;position:sticky;top:0}}
  tr:nth-child(even){{background:#f9f9f9}}
  tr:hover{{background:#e3f2fd}}
  .no-data{{text-align:center;padding:40px;color:#666;font-size:16px}}
  .process-tag{{display:inline-block;padding:3px 8px;background:#e3f2fd;color:#1565C0;border-radius:12px;font-size:11px;margin:2px}}
</style>
</head>
<body>
<h1>🎀 每日产量登记系统</h1>

<div class="container">
  <div class="filter-box">
    <select id="empSelect">
      <option value="">选择员工</option>
      {"".join([f'<option value="{k}">{v["name"]} ({k})</option>' for k, v in employees.items()])}
    </select>
    <select id="dateSelect">
      <option value="">选择日期</option>
    </select>
    <button onclick="loadRecords()">查询</button>
  </div>
  
  <div id="recordTable"></div>
</div>

<script>
// 导入的数据
const EMPLOYEES = {json.dumps(employees, ensure_ascii=False)};
const RECORDS = {json.dumps(records, ensure_ascii=False)};

// 获取所有日期
const allDates = [...new Set(Object.values(RECORDS).flatMap(empRecords => 
  Object.keys(empRecords)
))].sort().reverse();

// 填充日期选择
const dateSelect = document.getElementById('dateSelect');
allDates.forEach(date => {{
  const option = document.createElement('option');
  option.value = date;
  option.textContent = date;
  dateSelect.appendChild(option);
}});

// 加载记录
function loadRecords() {{
  const empId = document.getElementById('empSelect').value;
  const date = document.getElementById('dateSelect').value;
  
  let filteredRecords = [];
  
  Object.keys(RECORDS).forEach(eid => {{
    if(empId && eid !== empId) return;
    
    Object.keys(RECORDS[eid]).forEach(d => {{
      if(date && d !== date) return;
      
      Object.keys(RECORDS[eid][d]).forEach(prod => {{
        RECORDS[eid][d][prod].forEach(rec => {{
          const empName = EMPLOYEES[eid]?.name || eid;
          filteredRecords.push({{
            工号: eid,
            姓名: empName,
            日期: d,
            产品: prod,
            工序: rec.name,
            数量: rec.n,
            单价: rec.p
          }});
        }});
      }});
    }});
  }});
  
  renderTable(filteredRecords);
}}

// 渲染表格
function renderTable(records) {{
  const tableDiv = document.getElementById('recordTable');
  
  if(records.length === 0) {{
    tableDiv.innerHTML = '<div class="no-data">没有找到相关记录</div>';
    return;
  }}
  
  let html = '<table><thead><tr><th>工号</th><th>姓名</th><th>日期</th><th>产品</th><th>工序</th><th>数量</th><th>单价</th><th>金额</th></tr></thead><tbody>';
  
  records.forEach(rec => {{
    html += `<tr>
      <td>{{rec.工号}}</td>
      <td>{{rec.姓名}}</td>
      <td>{{rec.日期}}</td>
      <td>{{rec.产品}}</td>
      <td><span class="process-tag">{{rec.工序}}</span></td>
      <td>{{rec.数量}}</td>
      <td>¥{{rec.单价.toFixed(2)}}</td>
      <td>¥{{(rec.数量 * rec.单价).toFixed(2)}}</td>
    </tr>`;
  }});
  
  html += '</tbody></table>';
  tableDiv.innerHTML = html;
}}

// 页面加载后自动显示所有记录
window.onload = function() {{
  loadRecords();
}};
</script>
</body>
</html>'''

# 保存新文件
with open('index -backup.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("成功！生成全新的 index-backup.html")
print(f"包含数据：{len(employees)} 位员工，{len(records)} 条记录")
