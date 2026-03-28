import pandas as pd
import json

# 读取 Excel 文件
excel_file = '(生产登记表)表格视图.xlsx'
df = pd.read_excel(excel_file, sheet_name='表格视图')

# 填充 NaN
df = df.fillna('')

# 构建记录数据结构
# records[empId][date][prodKey] = [{name: '工序名', n: 数量, p: 单价, time: 时间, batchCode: 批次号}]

records = {}

for _, row in df.iterrows():
    emp_id = str(row['工号']).strip()
    emp_name = str(row['姓名']).strip()
    date = str(row['日期']).strip()
    prod_name = str(row['产品名称']).strip()

    # 初始化员工
    if emp_id not in records:
        records[emp_id] = {}

    # 初始化日期
    if date not in records[emp_id]:
        records[emp_id][date] = {}

    # 初始化产品
    if prod_name not in records[emp_id][date]:
        records[emp_id][date][prod_name] = []

    # 遍历所有工序列
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
            if value and value != '':
                # 提取工序名称
                process_name = col
                if ':' in col:
                    process_name = col.split(':')[-1]
                elif '-' in col:
                    continue  # 跳过项目列

                # 提取数量
                try:
                    qty = float(value)
                except:
                    # 检查是否包含数字
                    import re
                    numbers = re.findall(r'\d+\.?\d*', str(value))
                    if numbers:
                        qty = float(numbers[0])
                    else:
                        continue

                # 添加记录
                records[emp_id][date][prod_name].append({
                    'name': process_name,
                    'n': qty,
                    'p': 0.5,  # 默认单价
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
        employees[emp_id] = {
            'id': emp_id,
            'name': emp_name
        }

# 输出结果
result = {
    'employees': employees,
    'records': records
}

print(f"导入完成！")
print(f"员工数: {len(employees)}")
print(f"记录数: {len(records)}")
print(f"\n员工列表:")
for emp_id, emp in employees.items():
    print(f"  {emp_id}: {emp['name']}")

# 保存到 JSON 文件
with open('imported_records.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"\n数据已保存到: imported_records.json")
