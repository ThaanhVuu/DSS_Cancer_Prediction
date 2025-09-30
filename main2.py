import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np

# Thiết lập màu , kiểu chữ... biểu đồ
sns.set_style("whitegrid")
plt.rcParams['font.size'] = 10
plt.rcParams['figure.figsize'] = (10, 6)

# Tập dữ liệu (đọc)
df = pd.read_csv('The_Cancer_data_1500_V2.csv')  # Bỏ comment này nếu bạn đang đọc dữ liệu từ file

# --- HÌNH 3.1: Histogram phân bố của các biến số liên tục ---
fig, axes = plt.subplots(2, 2, figsize=(12, 10))
fig.suptitle('Hình 3.1: Phân bố của các Biến Số Liên Tục', fontsize=16, fontweight='bold')

sns.histplot(df['Age'], kde=True, color='skyblue', ax=axes[0, 0], bins=15)
axes[0, 0].set_title('Phân phối của Age')
axes[0, 0].set_ylabel('Tần số')

sns.histplot(df['BMI'], kde=True, color='lightgreen', ax=axes[0, 1], bins=15)
axes[0, 1].set_title('Phân phối của BMI')

sns.histplot(df['PhysicalActivity'], kde=True, color='salmon', ax=axes[1, 0], bins=15)
axes[1, 0].set_title('Phân phối của PhysicalActivity')
axes[1, 0].set_ylabel('Tần số')

sns.histplot(df['AlcoholIntake'], kde=True, color='gold', ax=axes[1, 1], bins=15)
axes[1, 1].set_title('Phân phối của AlcoholIntake')

plt.tight_layout()
plt.show()

# --- HÌNH 3.2: Bar plot thể hiện số lượng mẫu của hai lớp Diagnosis ---
plt.figure(figsize=(8, 6))
ax = sns.countplot(x='Diagnosis', data=df, palette=['lightblue', 'lightcoral'])
plt.title('Hình 3.2: Phân bố của Biến Mục tiêu (Diagnosis)', fontweight='bold')

# Thêm số liệu cụ thể lên trên mỗi thanh
for p in ax.patches:
    ax.annotate(f'{p.get_height()}', (p.get_x() + p.get_width() / 2., p.get_height()),
                ha='center', va='bottom', fontweight='bold', fontsize=12)

plt.ylabel('Số lượng mẫu')
plt.xlabel('Diagnosis (0 = Không mắc, 1 = Mắc)')
plt.show()

# --- HÌNH 3.3: Heatmap thể hiện ma trận tương quan ---
# Tính toán ma trận tương quan
plt.figure(figsize=(10, 8))
corr_matrix = df.corr(numeric_only=True)

# Vẽ heatmap
mask = np.triu(np.ones_like(corr_matrix, dtype=bool))
sns.heatmap(corr_matrix, mask=mask, annot=True, fmt=".2f", cmap='coolwarm', center=0,
            square=True, linewidths=.5, cbar_kws={"shrink": .8})
plt.title('Hình 3.3: Ma trận Tương quan giữa các Biến\n', fontweight='bold')
plt.tight_layout()
plt.show()

# --- HÌNH 3.4: Boxplot so sánh sự phân bố của Age và BMI giữa hai nhóm Diagnosis ---
fig, axes = plt.subplots(1, 2, figsize=(14, 6))
fig.suptitle('Hình 3.4: Phân bố của Age và BMI theo Nhóm Diagnosis', fontsize=16, fontweight='bold')

# Vẽ boxplot cho Age
sns.boxplot(x='Diagnosis', y='Age', data=df, ax=axes[0], palette=['lightblue', 'lightcoral'])
axes[0].set_title('Phân bố Age')
axes[0].set_xlabel('Diagnosis (0 = Không mắc, 1 = Mắc)')
axes[0].set_ylabel('Tuổi')

# Vẽ boxplot cho BMI
sns.boxplot(x='Diagnosis', y='BMI', data=df, ax=axes[1], palette=['lightblue', 'lightcoral'])
axes[1].set_title('Phân bố BMI')
axes[1].set_xlabel('Diagnosis (0 = Không mắc, 1 = Mắc)')
axes[1].set_ylabel('Chỉ số BMI')

plt.tight_layout()
plt.show()
